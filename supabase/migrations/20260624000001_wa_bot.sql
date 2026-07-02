-- Bot IA para WhatsApp: campos de configuración y estado

ALTER TABLE whatsapp_numbers
  ADD COLUMN IF NOT EXISTS bot_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS bot_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_from_ad BOOLEAN NOT NULL DEFAULT false;
