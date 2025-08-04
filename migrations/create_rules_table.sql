-- Create rules table
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rules_organization_id ON rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(type);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_updated_at();

-- Add RLS policies
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules from their organization" ON rules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth.uid() = id
    )
  );

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