-- WhatsApp Inbox Migration for crmyulara
-- Run this in Supabase SQL Editor

-- ============================================================
-- TABLE: whatsapp_numbers
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  created_by uuid REFERENCES users(id),
  display_name text NOT NULL,
  phone_number text,
  session_id text UNIQUE,
  api_key text,
  webhook_secret text,
  is_connected boolean DEFAULT false,
  status text DEFAULT 'disconnected',
  log_messages boolean DEFAULT true,
  last_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for whatsapp_numbers
ALTER TABLE whatsapp_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_numbers_org_access" ON whatsapp_numbers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: wa_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id),
  whatsapp_number_id uuid NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  branch_id uuid REFERENCES branches(id),
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES users(id),
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, whatsapp_number_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wa_conversations_org ON wa_conversations(organization_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_number ON wa_conversations(whatsapp_number_id);

-- RLS for wa_conversations
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conversations_org_access" ON wa_conversations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: wa_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  direction text NOT NULL,
  message_type text DEFAULT 'text',
  sent_by uuid REFERENCES users(id),
  delivery_status text DEFAULT 'pending',
  whatsapp_message_id text,
  replied_to_message_id uuid REFERENCES wa_messages(id),
  media_url text,
  transcription text,
  metadata jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON wa_messages(conversation_id, created_at DESC);

-- Deduplication constraint
ALTER TABLE wa_messages
  ADD CONSTRAINT wa_messages_whatsapp_id_unique UNIQUE (whatsapp_message_id);

-- RLS for wa_messages (via conversation → organization)
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_messages_org_access" ON wa_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM wa_conversations
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- TABLE: organization_wasender_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_wasender_tokens (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  wasender_personal_token text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- RLS for organization_wasender_tokens
ALTER TABLE organization_wasender_tokens ENABLE ROW LEVEL SECURITY;

-- Todos los miembros de la org pueden leer el token
CREATE POLICY "org_wasender_token_read" ON organization_wasender_tokens
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Solo admins pueden escribir
CREATE POLICY "org_wasender_token_write" ON organization_wasender_tokens
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
    )
  );

-- ============================================================
-- STORAGE BUCKET: whatsapp-media
-- Run this separately or via Supabase dashboard
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('whatsapp-media', 'whatsapp-media', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy (allow authenticated users to upload)
-- CREATE POLICY "whatsapp_media_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');
-- CREATE POLICY "whatsapp_media_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'whatsapp-media');
