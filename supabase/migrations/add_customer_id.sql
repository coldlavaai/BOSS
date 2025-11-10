-- Add customer_id column to customers table (simple integer)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS customer_id INTEGER UNIQUE;

-- Create a sequence for customer IDs
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START 1;

-- Create a function to generate the next customer ID
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('customer_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Update existing customers with customer IDs (if they don't have one)
DO $$
DECLARE
  customer_record RECORD;
BEGIN
  FOR customer_record IN
    SELECT id FROM customers WHERE customer_id IS NULL ORDER BY created_at
  LOOP
    UPDATE customers
    SET customer_id = generate_customer_id()
    WHERE id = customer_record.id;
  END LOOP;
END $$;

-- Make customer_id NOT NULL after populating existing records
ALTER TABLE customers
ALTER COLUMN customer_id SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);

-- Add comment
COMMENT ON COLUMN customers.customer_id IS 'Unique numerical customer identifier (1, 2, 3...)';
