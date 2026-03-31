-- Fix duplicate conversations caused by the same contact having multiple contacts/conversations
-- Strategy: keep the oldest contact and oldest conversation per (phone, organization_id)

BEGIN;

-- 1. Move messages from duplicate conversations to the primary (oldest) conversation
WITH primary_conversations AS (
  -- For each (contact phone, whatsapp_number_id), find the oldest conversation
  SELECT DISTINCT ON (c.phone, wc.whatsapp_number_id)
    c.phone,
    wc.whatsapp_number_id,
    wc.id AS primary_conversation_id,
    c.id AS primary_contact_id
  FROM wa_conversations wc
  JOIN contacts c ON c.id = wc.contact_id
  ORDER BY c.phone, wc.whatsapp_number_id, wc.created_at ASC
),
duplicate_conversations AS (
  SELECT
    wc.id AS duplicate_conversation_id,
    pc.primary_conversation_id
  FROM wa_conversations wc
  JOIN contacts c ON c.id = wc.contact_id
  JOIN primary_conversations pc
    ON c.phone = pc.phone
    AND wc.whatsapp_number_id = pc.whatsapp_number_id
  WHERE wc.id != pc.primary_conversation_id
)
UPDATE wa_messages
SET conversation_id = dc.primary_conversation_id
FROM duplicate_conversations dc
WHERE wa_messages.conversation_id = dc.duplicate_conversation_id;

-- 2. Update last_message_at on primary conversations
UPDATE wa_conversations wc
SET last_message_at = sub.max_created_at
FROM (
  SELECT conversation_id, MAX(created_at) AS max_created_at
  FROM wa_messages
  GROUP BY conversation_id
) sub
WHERE wc.id = sub.conversation_id;

-- 3. Delete duplicate conversations (now empty of messages)
WITH primary_conversations AS (
  SELECT DISTINCT ON (c.phone, wc.whatsapp_number_id)
    c.phone,
    wc.whatsapp_number_id,
    wc.id AS primary_conversation_id
  FROM wa_conversations wc
  JOIN contacts c ON c.id = wc.contact_id
  ORDER BY c.phone, wc.whatsapp_number_id, wc.created_at ASC
)
DELETE FROM wa_conversations wc
USING contacts c, primary_conversations pc
WHERE wc.contact_id = c.id
  AND c.phone = pc.phone
  AND wc.whatsapp_number_id = pc.whatsapp_number_id
  AND wc.id != pc.primary_conversation_id;

-- 4. Update duplicate contacts to point conversations to the primary contact
WITH primary_contacts AS (
  SELECT DISTINCT ON (phone, organization_id)
    id AS primary_contact_id,
    phone,
    organization_id
  FROM contacts
  ORDER BY phone, organization_id, created_at ASC
)
UPDATE wa_conversations wc
SET contact_id = pc.primary_contact_id
FROM contacts c, primary_contacts pc
WHERE wc.contact_id = c.id
  AND c.phone = pc.phone
  AND c.organization_id = pc.organization_id
  AND c.id != pc.primary_contact_id;

-- 5. Delete duplicate contacts (no longer referenced by conversations)
WITH primary_contacts AS (
  SELECT DISTINCT ON (phone, organization_id)
    id AS primary_contact_id,
    phone,
    organization_id
  FROM contacts
  ORDER BY phone, organization_id, created_at ASC
)
DELETE FROM contacts c
USING primary_contacts pc
WHERE c.phone = pc.phone
  AND c.organization_id = pc.organization_id
  AND c.id != pc.primary_contact_id
  AND NOT EXISTS (
    SELECT 1 FROM wa_conversations wc WHERE wc.contact_id = c.id
  );

COMMIT;
