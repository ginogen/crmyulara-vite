import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { generateInquiryNumber } from '../../src/lib/utils/strings';

// Función para crear el cliente Supabase admin
const createAdminClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or service key is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

// Función auxiliar para extraer campos
function extractField(data: any, ...possibleFieldNames: string[]): string | undefined {
  if (!data) return undefined;
  
  if (Array.isArray(data.field_data)) {
    for (const field of data.field_data) {
      if (possibleFieldNames.includes(field.name)) {
        return field.values[0];
      }
    }
  }
  
  for (const fieldName of possibleFieldNames) {
    if (data[fieldName] !== undefined) {
      return String(data[fieldName]);
    }
  }
  
  const lastItem = possibleFieldNames[possibleFieldNames.length - 1];
  if (lastItem && !lastItem.includes('_') && !lastItem.match(/^[a-z]+$/)) {
    return lastItem;
  }
  
  return undefined;
}

export const handler: Handler = async (event) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verificar el secreto del webhook
    const authHeader = event.headers['x-webhook-secret'];
    const WEBHOOK_SECRET = process.env.MAKE_WEBHOOK_SECRET;
    
    if (!authHeader || authHeader !== WEBHOOK_SECRET) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parsear el cuerpo de la petición
    const data = JSON.parse(event.body || '{}');
    
    // Usar el cliente admin
    const supabase = createAdminClient();

    // Validar campos requeridos
    if (!data.organization_id || !data.branch_id || !data.form_id || !data.lead_data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Guardar el lead de Facebook
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
        body: JSON.stringify({ error: 'Error guardando lead' })
      };
    }

    // Conversión automática si está habilitada
    if (data.auto_convert === true) {
      try {
        const inquiryNumber = generateInquiryNumber();
        const leadData = data.lead_data;
        
        // Extraer datos
        const fullName = extractField(leadData, 'full_name', 'name') || 'Sin nombre';
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
        const assignedToUserId = '3c6d7374-8403-4bca-bb84-c937c4b5b94f';

        // Insertar el nuevo lead
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert([{
            inquiry_number: inquiryNumber,
            full_name: fullName,
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
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Error creando lead',
              details: leadError
            })
          };
        }

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

        return {
          statusCode: 200,
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
          body: JSON.stringify({ 
            error: 'Error en la conversión del lead',
            details: error instanceof Error ? error.message : String(error)
          })
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Lead guardado exitosamente' 
      })
    };
    
  } catch (error) {
    console.error('Error en webhook de Make:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};