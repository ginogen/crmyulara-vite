import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { generateInquiryNumber } from '../../src/lib/utils/strings';

// Función para crear el cliente Supabase admin
const createAdminClient = () => {
  // Intentar múltiples nombres de variables de entorno para compatibilidad
  const supabaseUrl = process.env.SUPABASE_URL || 
                     process.env.VITE_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  console.log('Configuración Supabase:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    urlLength: supabaseUrl?.length || 0
  });
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(`Supabase configuration missing. URL: ${!!supabaseUrl}, ServiceKey: ${!!supabaseServiceKey}`);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

// Función auxiliar para extraer campos
function extractField(data: any, ...possibleFieldNames: string[]): string | undefined {
  if (!data) return undefined;
  
  // Si es un objeto con field_data (formato Facebook)
  if (Array.isArray(data.field_data)) {
    for (const field of data.field_data) {
      if (possibleFieldNames.includes(field.name)) {
        return field.values[0];
      }
    }
  }
  
  // Si Make envía los datos ya procesados
  for (const fieldName of possibleFieldNames) {
    if (data[fieldName] !== undefined) {
      return String(data[fieldName]); // Convertir a string para asegurar compatibilidad
    }
  }
  
  return undefined;
}

export const handler: Handler = async (event) => {
  console.log('Webhook recibido:', {
    method: event.httpMethod,
    headers: Object.keys(event.headers),
    bodyLength: event.body?.length || 0
  });

  // Agregar headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejar preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verificar que la petición tiene un secreto válido
    const authHeader = event.headers['x-webhook-secret'];
    const WEBHOOK_SECRET = process.env.MAKE_WEBHOOK_SECRET;
    
    console.log('Verificación de autenticación:', {
      hasAuthHeader: !!authHeader,
      hasWebhookSecret: !!WEBHOOK_SECRET,
      authHeaderLength: authHeader?.length || 0
    });
    
    if (!authHeader || authHeader !== WEBHOOK_SECRET) {
      console.error('Error de autenticación:', {
        provided: authHeader,
        expected: WEBHOOK_SECRET?.substring(0, 10) + '...'
      });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Obtener el cuerpo de la petición
    let data;
    try {
      data = JSON.parse(event.body || '{}');
      console.log('Datos recibidos:', {
        organization_id: data.organization_id,
        branch_id: data.branch_id,
        form_id: data.form_id,
        auto_convert: data.auto_convert,
        lead_data_keys: Object.keys(data.lead_data || {})
      });
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }
    
    // Usar el cliente admin
    const supabase = createAdminClient();

    // Validar campos requeridos
    if (!data.organization_id || !data.branch_id || !data.form_id || !data.lead_data) {
      console.error('Campos requeridos faltantes:', {
        has_org_id: !!data.organization_id,
        has_branch_id: !!data.branch_id,
        has_form_id: !!data.form_id,
        has_lead_data: !!data.lead_data
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missing: {
            organization_id: !data.organization_id,
            branch_id: !data.branch_id,
            form_id: !data.form_id,
            lead_data: !data.lead_data
          }
        })
      };
    }

    // Guardar el lead de Facebook
    console.log('Guardando lead de Facebook...');
    const { error: saveError } = await supabase
      .from('facebook_leads')
      .insert([{
        facebook_lead_id: data.facebook_lead_id || `make_${Date.now()}`,
        form_id: data.form_id,
        page_id: data.page_id || 'make_integration',
        organization_id: data.organization_id,
        branch_id: data.branch_id,
        lead_data: data.lead_data,
        processed: false,
        converted_to_lead: false,
      }]);

    if (saveError) {
      console.error('Error guardando lead de Facebook:', saveError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error guardando lead',
          details: saveError
        })
      };
    }

    console.log('Lead de Facebook guardado exitosamente');

    // Conversión automática si está habilitada
    if (data.auto_convert === true) {
      console.log('Iniciando conversión automática...');
      try {
        const inquiryNumber = generateInquiryNumber();
        const leadData = data.lead_data;
        
        console.log('Procesando datos del lead:', leadData);
        
        // Extraer datos
        const fullName = extractField(leadData, 'full_name', 'name') || 'Sin nombre';
        const email = extractField(leadData, 'email') || null;
        const phone = extractField(leadData, 'phone_number', 'phone') || '';
        const province = extractField(leadData, 'province', 'city', 'location') || '';
        
        // Procesar pax_count
        const paxCountFromData = extractField(leadData, 'pax_count', 'pax', 'people');
        let paxCount = 1;
        
        if (paxCountFromData) {
          const parsedValue = Number(paxCountFromData);
          if (!isNaN(parsedValue)) {
            paxCount = parsedValue;
          } else {
            const numbersOnly = paxCountFromData.match(/\d+/);
            if (numbersOnly && numbersOnly.length > 0) {
              paxCount = Number(numbersOnly[0]);
            }
          }
        }
        
        const travelDate = extractField(leadData, 'estimated_travel_date', 'travel_date', 'date') || 'No especificada';
        const origin = extractField(leadData, 'origin') || 'Facebook Ads';
        const assignedToUserId = data.assigned_to || null;

        console.log('Datos procesados para el lead:', {
          fullName,
          email,
          phone, 
          province,
          paxCount,
          travelDate,
          origin,
          organization_id: data.organization_id,
          branch_id: data.branch_id
        });

        // Insertar el nuevo lead
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert([{
            inquiry_number: inquiryNumber,
            full_name: fullName,
            email: email,
            status: 'new',
            assigned_to: assignedToUserId,
            origin: origin,
            province: province,
            phone: phone,
            pax_count: paxCount,
            estimated_travel_date: travelDate,
            organization_id: data.organization_id,
            branch_id: data.branch_id,
          }])
          .select()
          .single();

        if (leadError) {
          console.error('Error creando lead:', leadError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Error creando lead', 
              details: leadError, 
              processed_data: {
                fullName,
                email,
                phone, 
                province,
                paxCount,
                travelDate,
                origin
              }
            })
          };
        }

        console.log('Lead creado exitosamente:', newLead.id);

        // Actualizar facebook_leads
        await supabase
          .from('facebook_leads')
          .update({
            processed: true,
            converted_to_lead: true,
            lead_id: newLead.id,
            conversion_date: new Date().toISOString()
          })
          .eq('facebook_lead_id', data.facebook_lead_id);

        console.log('Lead de Facebook actualizado como procesado');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Lead guardado y convertido exitosamente',
            lead_id: newLead.id
          })
        };
      } catch (error) {
        console.error('Error en la conversión del lead:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error en la conversión del lead',
            details: error instanceof Error ? error.message : String(error)
          })
        };
      }
    }

    console.log('Webhook procesado exitosamente sin conversión automática');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Lead guardado exitosamente' 
      })
    };
    
  } catch (error) {
    console.error('Error en webhook de Make:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};