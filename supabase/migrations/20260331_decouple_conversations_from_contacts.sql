-- Decouple WhatsApp conversations from automatic contact creation
-- Conversations now store phone_number/push_name directly and only link to contacts when user explicitly saves

-- 1. Add phone_number and push_name columns to wa_conversations
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS push_name text;

-- 2. Backfill phone_number from linked contacts
UPDATE wa_conversations
SET phone_number = c.phone
FROM contacts c
WHERE wa_conversations.contact_id = c.id
  AND wa_conversations.phone_number IS NULL;

-- 3. Drop old unique constraint and add new one based on phone_number
ALTER TABLE wa_conversations DROP CONSTRAINT IF EXISTS wa_conversations_contact_id_whatsapp_number_id_key;
ALTER TABLE wa_conversations ADD CONSTRAINT wa_conversations_phone_whatsapp_unique UNIQUE (phone_number, whatsapp_number_id);

-- 4. Index for phone_number lookups
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON wa_conversations(phone_number);
