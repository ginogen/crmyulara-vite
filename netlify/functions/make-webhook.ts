import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { generateInquiryNumber } from '../../src/lib/utils/strings';

// Función de reintento con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${operationName}: Intento ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log(`${operationName}: Éxito en intento ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`${operationName}: Error en intento ${attempt}:`, error);
      
      // Si es el último intento, no esperar
      if (attempt === maxRetries) {
        console.error(`${operationName}: Falló después de ${maxRetries} intentos`);
        throw error;
      }
      
      // Calcular delay exponencial con jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`${operationName}: Esperando ${Math.round(delay)}ms antes del siguiente intento`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

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

// Función para verificar si un error es retryable
function isRetryableError(error: any): boolean {
  // Errores de red que pueden ser temporales
  if (error.message?.includes('network') || 
      error.message?.includes('timeout') ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ENOTFOUND')) {
    return true;
  }
  
  // Errores de Supabase que pueden ser temporales
  if (error.code === 'PGRST301' || // Service unavailable
      error.code === 'PGRST302' || // Gateway timeout
      error.status === 503 ||       // Service unavailable
      error.status === 502 ||       // Bad gateway
      error.status === 504) {       // Gateway timeout
    return true;
  }
  
  // Errores de JWT que pueden resolverse con reintento
  if (error.message?.includes('JWT') || 
      error.message?.includes('token') ||
      error.status === 401) {
    return true;
  }
  
  return false;
}

export const handler: Handler = async (event) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  console.log(`[${requestId}] Webhook recibido:`, {
    method: event.httpMethod,
    headers: Object.keys(event.headers),
    bodyLength: event.body?.length || 0,
    contentType: event.headers['content-type'],
    userAgent: event.headers['user-agent']
  });

  // Log del body completo para debugging (solo los primeros 500 caracteres)
  if (event.body) {
    console.log(`[${requestId}] Body preview:`, event.body.substring(0, 500));
    console.log(`[${requestId}] Body length:`, event.body.length);
    
    // Verificar si hay caracteres problemáticos
    const problematicChars = [];
    for (let i = 0; i < Math.min(event.body.length, 1000); i++) {
      const char = event.body[i];
      if (char.charCodeAt(0) < 32 && char !== '\n' && char !== '\r' && char !== '\t') {
        problematicChars.push({ position: i, char: char, code: char.charCodeAt(0) });
      }
    }
    if (problematicChars.length > 0) {
      console.log(`[${requestId}] Caracteres problemáticos encontrados:`, problematicChars);
    }
  }

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
    
    console.log(`[${requestId}] Verificación de autenticación:`, {
      hasAuthHeader: !!authHeader,
      hasWebhookSecret: !!WEBHOOK_SECRET,
      authHeaderLength: authHeader?.length || 0
    });
    
    if (!authHeader || authHeader !== WEBHOOK_SECRET) {
      console.error(`[${requestId}] Error de autenticación:`, {
        provided: authHeader,
        expected: WEBHOOK_SECRET?.substring(0, 10) + '...'
      });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Obtener el cuerpo de la petición con mejor manejo de errores
    let data;
    try {
      // Limpiar el body si es necesario
      let cleanBody = event.body || '{}';
      
      // Remover caracteres de control problemáticos
      cleanBody = cleanBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      console.log(`[${requestId}] Intentando parsear JSON...`);
      data = JSON.parse(cleanBody);
      
      console.log(`[${requestId}] Datos recibidos:`, {
        organization_id: data.organization_id,
        branch_id: data.branch_id,
        form_id: data.form_id,
        auto_convert: data.auto_convert,
        lead_data_keys: Object.keys(data.lead_data || {}),
        facebook_lead_id: data.facebook_lead_id,
        page_id: data.page_id
      });
    } catch (parseError) {
             console.error(`[${requestId}] Error parseando JSON:`, parseError);
       console.error(`[${requestId}] Body problemático:`, event.body || 'null');
      
             // Intentar limpiar más agresivamente
       try {
         const cleanedBody = (event.body || '')
           .replace(/[\x00-\x1F\x7F]/g, '') // Remover todos los caracteres de control
           .replace(/\s+/g, ' ') // Normalizar espacios
           .trim();
        
        console.log(`[${requestId}] Intentando con body limpio...`);
        data = JSON.parse(cleanedBody);
        console.log(`[${requestId}] JSON parseado exitosamente después de limpieza`);
      } catch (secondParseError) {
        console.error(`[${requestId}] Error persistente parseando JSON:`, secondParseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON format',
            details: parseError instanceof Error ? parseError.message : String(parseError),
            body_preview: event.body?.substring(0, 200)
          })
        };
      }
    }
    
    // Usar el cliente admin
    const supabase = createAdminClient();

    // Validar campos requeridos
    if (!data.organization_id || !data.branch_id || !data.form_id || !data.lead_data) {
      console.error(`[${requestId}] Campos requeridos faltantes:`, {
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

    // Verificar si ya existe un lead con el mismo facebook_lead_id para evitar duplicados
    if (data.facebook_lead_id) {
      console.log(`[${requestId}] Verificando duplicados para facebook_lead_id:`, data.facebook_lead_id);
      const { data: existingLead, error: checkError } = await supabase
        .from('facebook_leads')
        .select('id')
        .eq('facebook_lead_id', data.facebook_lead_id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`[${requestId}] Error verificando duplicados:`, checkError);
      } else if (existingLead) {
        console.log(`[${requestId}] Lead duplicado encontrado, saltando procesamiento`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Lead ya existe, saltando procesamiento',
            duplicate: true
          })
        };
      }
    }

    // Guardar el lead de Facebook con reintento
    console.log(`[${requestId}] Guardando lead de Facebook...`);
    const { error: saveError } = await retryOperation(
      async () => {
        const result = await supabase
          .from('facebook_leads')
          .insert([{
            facebook_lead_id: data.facebook_lead_id || `make_${Date.now()}_${requestId}`,
            form_id: data.form_id,
            page_id: data.page_id || 'make_integration',
            organization_id: data.organization_id,
            branch_id: data.branch_id,
            lead_data: data.lead_data,
            processed: false,
            converted_to_lead: false,
          }]);
        
        if (result.error) {
          throw result.error;
        }
        
        return result;
      },
      3, // maxRetries
      1000, // baseDelay
      `[${requestId}] Guardar lead de Facebook`
    );

    if (saveError) {
      console.error(`[${requestId}] Error guardando lead de Facebook después de reintentos:`, saveError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error guardando lead después de reintentos',
          details: saveError
        })
      };
    }

    console.log(`[${requestId}] Lead de Facebook guardado exitosamente`);

    // Conversión automática si está habilitada
    if (data.auto_convert === true) {
      console.log(`[${requestId}] Iniciando conversión automática...`);
      try {
        const inquiryNumber = generateInquiryNumber();
        const leadData = data.lead_data;
        
        console.log(`[${requestId}] Procesando datos del lead:`, leadData);
        
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

        console.log(`[${requestId}] Datos procesados para el lead:`, {
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

        // Insertar el nuevo lead con reintento
        const { data: newLead, error: leadError } = await retryOperation(
          async () => {
            const result = await supabase
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
            
            if (result.error) {
              throw result.error;
            }
            
            return result;
          },
          3, // maxRetries
          1000, // baseDelay
          `[${requestId}] Crear lead`
        );

        if (leadError) {
          console.error(`[${requestId}] Error creando lead después de reintentos:`, leadError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Error creando lead después de reintentos', 
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

        console.log(`[${requestId}] Lead creado exitosamente:`, newLead.id);

        // Actualizar facebook_leads con reintento
        await retryOperation(
          async () => {
            const result = await supabase
              .from('facebook_leads')
              .update({
                processed: true,
                converted_to_lead: true,
                lead_id: newLead.id,
                conversion_date: new Date().toISOString()
              })
              .eq('facebook_lead_id', data.facebook_lead_id);
            
            if (result.error) {
              throw result.error;
            }
            
            return result;
          },
          3, // maxRetries
          1000, // baseDelay
          `[${requestId}] Actualizar lead de Facebook`
        );

        console.log(`[${requestId}] Lead de Facebook actualizado como procesado`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Lead guardado y convertido exitosamente',
            lead_id: newLead.id,
            request_id: requestId
          })
        };
      } catch (error) {
        console.error(`[${requestId}] Error en la conversión del lead después de reintentos:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error en la conversión del lead después de reintentos',
            details: error instanceof Error ? error.message : String(error),
            request_id: requestId
          })
        };
      }
    }

    console.log(`[${requestId}] Webhook procesado exitosamente sin conversión automática`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Lead guardado exitosamente',
        request_id: requestId
      })
    };
    
  } catch (error) {
    console.error(`[${requestId}] Error en webhook de Make:`, error);
    
    // Determinar si el error es retryable
    const isRetryable = isRetryableError(error);
    console.log(`[${requestId}] Error es retryable:`, isRetryable);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        retryable: isRetryable,
        request_id: requestId
      })
    };
  }
};