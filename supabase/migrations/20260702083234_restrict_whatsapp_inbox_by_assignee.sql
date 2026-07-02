-- Restrict WhatsApp inbox visibility to admins or the assigned advisor

UPDATE wa_conversations AS wc
SET assigned_to = c.assigned_to
FROM contacts AS c
WHERE wc.contact_id = c.id
  AND wc.assigned_to IS NULL
  AND c.assigned_to IS NOT NULL;

UPDATE wa_conversations AS wc
SET assigned_to = wn.created_by
FROM whatsapp_numbers AS wn
WHERE wc.whatsapp_number_id = wn.id
  AND wc.assigned_to IS NULL
  AND wn.created_by IS NOT NULL;

DROP POLICY IF EXISTS "wa_conversations_org_access" ON wa_conversations;
DROP POLICY IF EXISTS "wa_conversations_select_admin_or_assignee" ON wa_conversations;
DROP POLICY IF EXISTS "wa_conversations_update_admin_or_assignee" ON wa_conversations;

CREATE POLICY "wa_conversations_select_admin_or_assignee" ON wa_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'super_admin'
          OR (
            u.organization_id = wa_conversations.organization_id
            AND (
              u.role = 'org_admin'
              OR wa_conversations.assigned_to = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "wa_conversations_update_admin_or_assignee" ON wa_conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'super_admin'
          OR (
            u.organization_id = wa_conversations.organization_id
            AND (
              u.role = 'org_admin'
              OR wa_conversations.assigned_to = auth.uid()
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'super_admin'
          OR (
            u.organization_id = wa_conversations.organization_id
            AND (
              u.role = 'org_admin'
              OR wa_conversations.assigned_to = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "wa_messages_org_access" ON wa_messages;
DROP POLICY IF EXISTS "wa_messages_select_admin_or_assignee" ON wa_messages;

CREATE POLICY "wa_messages_select_admin_or_assignee" ON wa_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM wa_conversations wc
      JOIN users u ON u.id = auth.uid()
      WHERE wc.id = wa_messages.conversation_id
        AND (
          u.role = 'super_admin'
          OR (
            u.organization_id = wc.organization_id
            AND (
              u.role = 'org_admin'
              OR wc.assigned_to = auth.uid()
            )
          )
        )
    )
  );
