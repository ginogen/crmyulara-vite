-- Create contact_history table
CREATE TABLE IF NOT EXISTS contact_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS contact_history_created_at_idx ON contact_history(created_at);
CREATE INDEX IF NOT EXISTS contact_history_contact_id_idx ON contact_history(contact_id);
CREATE INDEX IF NOT EXISTS contact_history_user_id_idx ON contact_history(user_id);

-- Add RLS policies
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

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