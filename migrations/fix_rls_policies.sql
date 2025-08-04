-- =====================================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA HISTORIAL
-- =====================================================

-- DESHABILITAR RLS TEMPORALMENTE PARA DEPURACIÓN
-- Descomenta estas líneas solo para testing:
-- ALTER TABLE lead_history DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contact_history DISABLE ROW LEVEL SECURITY;

-- O USAR POLÍTICAS MÁS PERMISIVAS
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view lead history from their organization" ON lead_history;
DROP POLICY IF EXISTS "Users can insert lead history for their organization" ON lead_history;
DROP POLICY IF EXISTS "Users can view contact history from their organization" ON contact_history;
DROP POLICY IF EXISTS "Users can insert contact history for their organization" ON contact_history;

-- Crear políticas más simples y permisivas para lead_history
CREATE POLICY "Enable read access for authenticated users" ON lead_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON lead_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Crear políticas más simples y permisivas para contact_history
CREATE POLICY "Enable read access for authenticated users" ON contact_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON contact_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verificar que RLS está habilitado
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
DO $$
BEGIN
  RAISE NOTICE 'Verificando políticas RLS...';
  
  -- Verificar lead_history
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lead_history' 
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    RAISE NOTICE '✓ Política de lectura para lead_history creada';
  END IF;
  
  -- Verificar contact_history
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_history' 
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    RAISE NOTICE '✓ Política de lectura para contact_history creada';
  END IF;
END $$;

-- =====================================================
-- POLÍTICAS MÁS ESPECÍFICAS (OPCIONAL - PARA MÁS SEGURIDAD)
-- =====================================================
-- Si las políticas simples funcionan, puedes reemplazarlas con estas más específicas:

/*
-- Eliminar políticas simples
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON lead_history;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON lead_history;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON contact_history;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON contact_history;

-- Políticas específicas por organización para lead_history
CREATE POLICY "Users can view lead history from their organization" ON lead_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN users u ON u.organization_id = l.organization_id
      WHERE l.id = lead_history.lead_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lead history for their organization" ON lead_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN users u ON u.organization_id = l.organization_id
      WHERE l.id = lead_history.lead_id
      AND u.id = auth.uid()
    )
  );

-- Políticas específicas por organización para contact_history
CREATE POLICY "Users can view contact history from their organization" ON contact_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = contact_history.contact_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contact history for their organization" ON contact_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = contact_history.contact_id
      AND u.id = auth.uid()
    )
  );
*/