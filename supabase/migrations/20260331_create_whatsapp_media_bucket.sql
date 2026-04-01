-- Crear bucket público para media de WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política: usuarios autenticados pueden subir
CREATE POLICY "whatsapp_media_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'whatsapp-media');

-- Política: cualquiera puede leer (bucket público)
CREATE POLICY "whatsapp_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'whatsapp-media');
