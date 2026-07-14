-- whatsapp_numbers solo permitia acceso por membresia de organizacion, sin el bypass
-- de super_admin que wa_conversations si tiene (20260702083234). PostgREST aplica RLS
-- a los recursos embebidos, asi que un super_admin viendo otra organizacion recibia las
-- conversaciones pero el embed whatsapp_number resolvia NULL en todas las filas.

DROP POLICY IF EXISTS "whatsapp_numbers_org_access" ON whatsapp_numbers;

CREATE POLICY "whatsapp_numbers_org_access" ON whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'super_admin'
          OR u.organization_id = whatsapp_numbers.organization_id
        )
    )
  );
