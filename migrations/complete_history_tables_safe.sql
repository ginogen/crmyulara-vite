-- =====================================================
-- MIGRACIÓN SEGURA PARA TABLAS DE HISTORIAL Y REGLAS
-- Verifica existencia antes de crear
-- =====================================================

-- 1. CREAR TABLA DE REGLAS (RULES) - Solo si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('campaign', 'province')),
  condition TEXT NOT NULL,
  assigned_users UUID[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rules (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_rules_organization_id ON rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(type);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);

-- Eliminar trigger existente si existe y crear de nuevo
DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_updated_at();

-- RLS policies para rules (eliminar existentes primero)
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view rules from their organization" ON rules;
CREATE POLICY "Users can view rules from their organization" ON rules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

DROP POLICY IF EXISTS "Only super_admin and org_admin can insert rules" ON rules;
CREATE POLICY "Only super_admin and org_admin can insert rules" ON rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid() = id
      AND role IN ('super_admin', 'org_admin')
      AND organization_id = rules.organization_id
    )
  );

DROP POLICY IF EXISTS "Only super_admin and org_admin can update rules" ON rules;
CREATE POLICY "Only super_admin and org_admin can update rules" ON rules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid() = id
      AND role IN ('super_admin', 'org_admin')
      AND organization_id = rules.organization_id
    )
  );

DROP POLICY IF EXISTS "Only super_admin and org_admin can delete rules" ON rules;
CREATE POLICY "Only super_admin and org_admin can delete rules" ON rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid() = id
      AND role IN ('super_admin', 'org_admin')
      AND organization_id = rules.organization_id
    )
  );

-- 2. CREAR TABLA DE HISTORIAL DE LEADS (LEAD_HISTORY) - Solo si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para lead_history
CREATE INDEX IF NOT EXISTS lead_history_created_at_idx ON lead_history(created_at);
CREATE INDEX IF NOT EXISTS lead_history_lead_id_idx ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS lead_history_user_id_idx ON lead_history(user_id);

-- RLS policies para lead_history
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lead history from their organization" ON lead_history;
CREATE POLICY "Users can view lead history from their organization" ON lead_history
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE auth.uid() = id
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert lead history for their organization" ON lead_history;
CREATE POLICY "Users can insert lead history for their organization" ON lead_history
  FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE auth.uid() = id
      )
    )
  );

-- 3. CREAR TABLA DE HISTORIAL DE CONTACTOS (CONTACT_HISTORY) - Solo si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para contact_history
CREATE INDEX IF NOT EXISTS contact_history_created_at_idx ON contact_history(created_at);
CREATE INDEX IF NOT EXISTS contact_history_contact_id_idx ON contact_history(contact_id);
CREATE INDEX IF NOT EXISTS contact_history_user_id_idx ON contact_history(user_id);

-- RLS policies para contact_history
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contact history from their organization" ON contact_history;
CREATE POLICY "Users can view contact history from their organization" ON contact_history
  FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE auth.uid() = id
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert contact history for their organization" ON contact_history;
CREATE POLICY "Users can insert contact history for their organization" ON contact_history
  FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT id FROM contacts 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE auth.uid() = id
      )
    )
  );

-- 4. CREAR TABLA DE MENSAJES DE WHATSAPP (WHATSAPP_MESSAGES) - Solo si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para whatsapp_messages
CREATE INDEX IF NOT EXISTS whatsapp_messages_contact_id_idx ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_organization_id_idx ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_sent_by_idx ON whatsapp_messages(sent_by);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_at_idx ON whatsapp_messages(created_at);

-- RLS policies para whatsapp_messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view whatsapp messages from their organization" ON whatsapp_messages;
CREATE POLICY "Users can view whatsapp messages from their organization" ON whatsapp_messages
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

DROP POLICY IF EXISTS "Users can insert whatsapp messages for their organization" ON whatsapp_messages;
CREATE POLICY "Users can insert whatsapp messages for their organization" ON whatsapp_messages
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

-- 5. CREAR TABLA DE PLANTILLAS DE WHATSAPP (WHATSAPP_TEMPLATES) - Solo si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para whatsapp_templates
CREATE INDEX IF NOT EXISTS whatsapp_templates_organization_id_idx ON whatsapp_templates(organization_id);

-- RLS policies para whatsapp_templates
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view whatsapp templates from their organization" ON whatsapp_templates;
CREATE POLICY "Users can view whatsapp templates from their organization" ON whatsapp_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

DROP POLICY IF EXISTS "Users can manage whatsapp templates for their organization" ON whatsapp_templates;
CREATE POLICY "Users can manage whatsapp templates for their organization" ON whatsapp_templates
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

-- =====================================================
-- VERIFICACIÓN DE TABLAS CREADAS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Migración completada. Tablas verificadas:';
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rules') THEN
    RAISE NOTICE '✓ Tabla rules existe';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lead_history') THEN
    RAISE NOTICE '✓ Tabla lead_history existe';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_history') THEN
    RAISE NOTICE '✓ Tabla contact_history existe';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_messages') THEN
    RAISE NOTICE '✓ Tabla whatsapp_messages existe';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_templates') THEN
    RAISE NOTICE '✓ Tabla whatsapp_templates existe';
  END IF;
END $$;