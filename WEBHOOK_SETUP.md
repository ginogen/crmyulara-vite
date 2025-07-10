# Configuración del Webhook de Make

## Variables de Entorno Requeridas en Netlify

Para que el webhook funcione correctamente, debes configurar las siguientes variables de entorno en el dashboard de Netlify:

### 1. Ir al Dashboard de Netlify
1. Ve a tu sitio en [Netlify](https://app.netlify.com)
2. Selecciona tu sitio `yulara-crm`
3. Ve a **Site settings** > **Environment variables**

### 2. Configurar las Variables

Agrega estas variables de entorno:

```
SUPABASE_URL = https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY = tu-service-role-key-de-supabase
MAKE_WEBHOOK_SECRET = 9655f54150afeabe2d8a0162e3c12fe64f36ec322802dd62d6312444399bf9ac
```

### 3. Obtener las Credenciales de Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Ve a **Settings** > **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Verificar la Configuración

Después de configurar las variables:

1. Haz un nuevo deploy en Netlify
2. Prueba el webhook con el script de prueba:

```bash
cd crmyulara-vite
node test-webhook.js
```

## Función de Reintento Automático

El webhook ahora incluye una función de reintento robusta que maneja automáticamente:

### ✅ Errores que se reintentan automáticamente:

- **Errores de red temporales** (timeout, ECONNRESET, ENOTFOUND)
- **Errores de Supabase temporales** (503, 502, 504, PGRST301, PGRST302)
- **Errores de JWT/token** que pueden resolverse con reintento
- **Errores de autenticación temporales** (401)

### 🔄 Configuración de reintentos:

- **Máximo de intentos**: 3 por operación
- **Delay base**: 1 segundo
- **Backoff exponencial**: El delay se duplica en cada intento
- **Jitter aleatorio**: Se agrega hasta 1 segundo de variación

### 📊 Logging detallado:

Cada reintento incluye logs detallados:
```
Guardar lead de Facebook: Intento 1/3
Guardar lead de Facebook: Error en intento 1: timeout
Guardar lead de Facebook: Esperando 1500ms antes del siguiente intento
Guardar lead de Facebook: Intento 2/3
Guardar lead de Facebook: Éxito en intento 2
```

## Solución de Problemas

### Error 500 - Variables de Entorno

Si ves errores 500, verifica:

1. **Variables configuradas correctamente**
2. **Deploy reciente** después de configurar variables
3. **Logs en Netlify** para ver errores específicos

### Verificar Logs

1. En Netlify, ve a **Functions** > **make-webhook**
2. Revisa los logs para ver errores específicos
3. Los logs ahora incluyen información detallada sobre:
   - Configuración de Supabase
   - Datos recibidos
   - Errores específicos
   - **Reintentos automáticos**

### Errores que NO se reintentan:

- **Errores de validación** (400) - datos incorrectos
- **Errores de autenticación** (401) - secreto incorrecto
- **Errores de permisos** (403) - falta de permisos
- **Errores de datos** (422) - datos malformados

### Plan de Pago en Netlify

**¿Sirve un plan de pago?**

**SÍ**, un plan de pago puede ayudar con:

1. **Mayor timeout** (hasta 15 segundos vs 10 segundos)
2. **Más memoria** para funciones
3. **Mejor rendimiento** en general
4. **Logs más detallados**

**Plan recomendado:** Netlify Pro ($19/mes)

### Alternativa: Migrar a Vercel

Si los problemas persisten, considera migrar a Vercel:

**Ventajas de Vercel:**
- Timeout de 60 segundos
- Mejor rendimiento
- Logs más detallados
- Mejor soporte para TypeScript

## Estructura de Datos Esperada

El webhook espera recibir:

```json
{
  "organization_id": "uuid-de-organizacion",
  "branch_id": "uuid-de-sucursal", 
  "form_id": "id-del-formulario",
  "page_id": "id-de-pagina",
  "facebook_lead_id": "id-del-lead",
  "lead_data": {
    "full_name": "Nombre completo",
    "email": "email@ejemplo.com",
    "phone": "+1234567890",
    "province": "Provincia",
    "pax_count": "2",
    "estimated_travel_date": "2024-01-15",
    "origin": "Origen del lead"
  },
  "auto_convert": true,
  "assigned_to": null
}
```

## Headers Requeridos

```
Content-Type: application/json
x-webhook-secret: tu-secreto-del-webhook
```

## Respuestas del Webhook

### Éxito (200)
```json
{
  "success": true,
  "message": "Lead guardado y convertido exitosamente",
  "lead_id": "uuid-del-lead-creado"
}
```

### Error (400/500)
```json
{
  "error": "Descripción del error",
  "details": "Detalles adicionales",
  "retryable": true/false
}
```

## Operaciones con Reintento

El webhook aplica reintentos automáticos a estas operaciones:

1. **Guardar lead de Facebook** - 3 intentos
2. **Crear lead** - 3 intentos  
3. **Actualizar lead de Facebook** - 3 intentos

### Ejemplo de respuesta con reintentos:

```json
{
  "success": true,
  "message": "Lead guardado y convertido exitosamente",
  "lead_id": "uuid-del-lead",
  "retries_used": 2
}
```

## Monitoreo de Reintentos

Para monitorear los reintentos:

1. **Revisar logs en Netlify** - Functions > make-webhook
2. **Usar el script de prueba** - `node test-webhook.js`
3. **Verificar métricas** - Los reintentos se registran en los logs

### Logs de ejemplo:

```
Webhook recibido: { method: 'POST', bodyLength: 1234 }
Configuración Supabase: { hasUrl: true, hasServiceKey: true }
Guardar lead de Facebook: Intento 1/3
Guardar lead de Facebook: Error en intento 1: timeout
Guardar lead de Facebook: Esperando 1500ms antes del siguiente intento
Guardar lead de Facebook: Intento 2/3
Guardar lead de Facebook: Éxito en intento 2
Lead de Facebook guardado exitosamente
``` 