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
  "details": "Detalles adicionales"
}
``` 