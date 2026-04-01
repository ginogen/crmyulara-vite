BEGIN;

-- 1. Merge conversations that share the same contact_id (non-NULL) but different phone_number
-- This captures cases like "Gino" appearing twice with two different phone numbers
WITH primary_convs AS (
  SELECT DISTINCT ON (contact_id, whatsapp_number_id)
    id AS primary_id, contact_id, whatsapp_number_id
  FROM wa_conversations
  WHERE contact_id IS NOT NULL
  ORDER BY contact_id, whatsapp_number_id, last_message_at DESC NULLS LAST, created_at ASC
),
dupes AS (
  SELECT wc.id AS dupe_id, pc.primary_id
  FROM wa_conversations wc
  JOIN primary_convs pc
    ON wc.contact_id = pc.contact_id
    AND wc.whatsapp_number_id = pc.whatsapp_number_id
  WHERE wc.id != pc.primary_id
)
UPDATE wa_messages SET conversation_id = d.primary_id
FROM dupes d WHERE wa_messages.conversation_id = d.dupe_id;

-- 2. Delete the now-empty duplicate conversations (by contact_id)
WITH primary_convs AS (
  SELECT DISTINCT ON (contact_id, whatsapp_number_id)
    id AS primary_id, contact_id, whatsapp_number_id
  FROM wa_conversations
  WHERE contact_id IS NOT NULL
  ORDER BY contact_id, whatsapp_number_id, last_message_at DESC NULLS LAST, created_at ASC
)
DELETE FROM wa_conversations wc
USING primary_convs pc
WHERE wc.contact_id = pc.contact_id
  AND wc.whatsapp_number_id = pc.whatsapp_number_id
  AND wc.id != pc.primary_id;

-- 3. Merge duplicates by phone_number (for conversations without contact_id)
WITH primary_convs AS (
  SELECT DISTINCT ON (phone_number, whatsapp_number_id)
    id AS primary_id, phone_number, whatsapp_number_id
  FROM wa_conversations
  WHERE phone_number IS NOT NULL
  ORDER BY phone_number, whatsapp_number_id, last_message_at DESC NULLS LAST, created_at ASC
),
dupes AS (
  SELECT wc.id AS dupe_id, pc.primary_id
  FROM wa_conversations wc
  JOIN primary_convs pc
    ON wc.phone_number = pc.phone_number
    AND wc.whatsapp_number_id = pc.whatsapp_number_id
  WHERE wc.id != pc.primary_id
)
UPDATE wa_messages SET conversation_id = d.primary_id
FROM dupes d WHERE wa_messages.conversation_id = d.dupe_id;

-- 4. Delete the now-empty duplicate conversations (by phone_number)
WITH primary_convs AS (
  SELECT DISTINCT ON (phone_number, whatsapp_number_id)
    id AS primary_id, phone_number, whatsapp_number_id
  FROM wa_conversations
  WHERE phone_number IS NOT NULL
  ORDER BY phone_number, whatsapp_number_id, last_message_at DESC NULLS LAST, created_at ASC
)
DELETE FROM wa_conversations wc
USING primary_convs pc
WHERE wc.phone_number = pc.phone_number
  AND wc.whatsapp_number_id = pc.whatsapp_number_id
  AND wc.id != pc.primary_id;

-- 5. Update last_message_at on remaining conversations
UPDATE wa_conversations wc
SET last_message_at = sub.max_created_at
FROM (
  SELECT conversation_id, MAX(created_at) AS max_created_at
  FROM wa_messages
  GROUP BY conversation_id
) sub
WHERE wc.id = sub.conversation_id;

COMMIT;
