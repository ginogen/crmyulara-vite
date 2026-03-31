-- Make columns nullable so webhook-created contacts (from Wasender) don't fail.
-- Wasender only provides phone and pushName; city, province, tag, assigned_to are unknown.
ALTER TABLE contacts ALTER COLUMN city DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN province DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN tag DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN assigned_to DROP NOT NULL;
