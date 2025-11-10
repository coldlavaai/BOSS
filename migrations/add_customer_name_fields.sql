-- Migration: Split customer name into first_name and last_name
-- Date: 2025-11-05
-- Description: Adds first_name and last_name columns to customers table

-- Add the new columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Optionally, you can make these required after migration:
-- ALTER TABLE customers ALTER COLUMN first_name SET NOT NULL;
-- ALTER TABLE customers ALTER COLUMN last_name SET NOT NULL;
