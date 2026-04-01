-- Cleanup: Delete conversations with invalid phone numbers (>15 digits)
-- These are WhatsApp LIDs incorrectly parsed as phone numbers

-- First delete messages belonging to invalid conversations
DELETE FROM wa_messages
WHERE conversation_id IN (
  SELECT id FROM wa_conversations
  WHERE LENGTH(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')) > 15
);

-- Then delete the invalid conversations themselves
DELETE FROM wa_conversations
WHERE LENGTH(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')) > 15;
