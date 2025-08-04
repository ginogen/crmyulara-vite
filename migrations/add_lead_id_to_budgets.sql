-- Add lead_id column to budgets table to allow association with leads
-- This migration adds the ability to create budgets from both contacts and leads

-- Add lead_id column (nullable, since budgets can be associated with either contacts OR leads)
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS lead_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS budgets_lead_id_idx 
ON public.budgets USING btree (lead_id);

-- Add check constraint to ensure budget is associated with either contact OR lead, but not both
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_contact_or_lead_check 
CHECK (
  (contact_id IS NOT NULL AND lead_id IS NULL) OR 
  (contact_id IS NULL AND lead_id IS NOT NULL)
);

-- Update any existing budgets that have neither contact_id nor lead_id (if any exist)
-- This is a safety measure - in practice this situation shouldn't exist
UPDATE public.budgets 
SET contact_id = NULL, lead_id = NULL 
WHERE contact_id IS NULL AND lead_id IS NULL;