-- Create customer-specific pricing overrides table
-- Allows VIP customers or special contracts to have custom pricing

BEGIN;

CREATE TABLE IF NOT EXISTS customer_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vehicle_size TEXT NOT NULL, -- 'small', 'medium', 'large', 'xl'

  -- Custom pricing in pence (overrides service_pricing)
  price_excl_vat INTEGER NOT NULL,
  price_incl_vat INTEGER NOT NULL,

  -- Optional metadata
  notes TEXT, -- e.g., "VIP discount", "Contract rate"
  valid_from DATE, -- When this pricing becomes active
  valid_until DATE, -- When this pricing expires (NULL = forever)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(customer_id, service_id, vehicle_size)
);

CREATE INDEX idx_customer_service_pricing_customer ON customer_service_pricing(customer_id);
CREATE INDEX idx_customer_service_pricing_service ON customer_service_pricing(service_id);
CREATE INDEX idx_customer_service_pricing_active ON customer_service_pricing(valid_from, valid_until);

-- Enable RLS
ALTER TABLE customer_service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read customer_service_pricing" ON customer_service_pricing
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage customer_service_pricing" ON customer_service_pricing
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
