# Despliegue en Netlify

## Pasos para desplegar este proyecto en Netlify

1. Crea una cuenta en [Netlify](https://www.netlify.com/) si aún no tienes una.

2. Desde el dashboard de Netlify, haz clic en "Add new site" > "Import an existing project".

3. Conecta con tu proveedor Git (GitHub, GitLab, Bitbucket) y selecciona este repositorio.

4. En la configuración del despliegue:
   - **Branch to deploy**: `main` (o la rama que uses para producción)
   - **Build command**: `npm run build` (ya está configurado en netlify.toml)
   - **Publish directory**: `dist` (ya está configurado en netlify.toml)

5. En "Advanced build settings", configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`

6. Haz clic en "Deploy site".

## Actualización de despliegues

- Cada vez que se haga un push a la rama configurada, Netlify desplegará automáticamente.
- También puedes disparar despliegues manuales desde el dashboard de Netlify.

## Dominios personalizados

1. En el dashboard de Netlify, ve a "Domain settings".
2. Haz clic en "Add custom domain".
3. Sigue las instrucciones para configurar tu dominio.

## Solución de problemas comunes

- Si las rutas no funcionan, verifica que las redirecciones en `netlify.toml` sean correctas.
- Para problemas de compilación, revisa los logs de despliegue en Netlify.
- Si tienes problemas con las variables de entorno, asegúrate de haberlas configurado correctamente en Netlify. 