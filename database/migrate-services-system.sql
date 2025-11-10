-- ============================================================================
-- DETAIL DYNAMICS - COMPLETE SERVICES & ADD-ONS DATABASE MIGRATION
-- ============================================================================
-- This script completely rebuilds the services system to match the
-- Detail Dynamics Complete Services & Pricing Guide
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP OLD TABLES AND DATA
-- ============================================================================

-- Drop old service-related tables
DROP TABLE IF EXISTS service_add_ons CASCADE;
DROP TABLE IF EXISTS add_ons CASCADE;
DROP TABLE IF EXISTS service_pricing CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;

-- Note: We keep vehicle_size_lookup as it's already defined

-- ============================================================================
-- STEP 2: CREATE NEW SCHEMA
-- ============================================================================

-- Service Categories (Valeting, Paint Correction, etc.)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Services Table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_hours DECIMAL(4,2), -- e.g., 2.5 for "2-3 hours"
  duration_text TEXT, -- e.g., "2-3 hours" or "1-2 days"
  availability TEXT, -- "mobile", "unit", "both"

  -- Additional details
  includes TEXT[], -- Array of what's included
  notes TEXT,

  -- Default coating/warranty info for paint correction services
  default_coating_years INTEGER,
  warranty_years INTEGER,

  -- Flags
  is_active BOOLEAN DEFAULT true,
  requires_quote BOOLEAN DEFAULT false, -- For "P.O.A" services

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Pricing (by vehicle size)
CREATE TABLE service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vehicle_size TEXT NOT NULL, -- 'small', 'medium', 'large', 'xl'

  -- Pricing in pence
  price_excl_vat INTEGER NOT NULL,
  price_incl_vat INTEGER NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(service_id, vehicle_size)
);

-- Add-ons Table
CREATE TABLE add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_excl_vat INTEGER, -- NULL for variable pricing
  price_incl_vat INTEGER,
  is_variable_price BOOLEAN DEFAULT false, -- True for "contact for quote"

  -- Type of add-on
  addon_type TEXT, -- 'standard', 'upgrade', 'coating_upgrade'

  -- For coating upgrades
  from_years INTEGER, -- e.g., 2 years
  to_years INTEGER,   -- e.g., 4 years

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service-AddOn Relationship (which add-ons are available for which services)
CREATE TABLE service_add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,

  -- Optional: Override pricing for specific service-addon combo
  override_price_excl_vat INTEGER,
  override_price_incl_vat INTEGER,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(service_id, add_on_id)
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_service_pricing_service ON service_pricing(service_id);
CREATE INDEX idx_service_pricing_size ON service_pricing(vehicle_size);
CREATE INDEX idx_service_add_ons_service ON service_add_ons(service_id);
CREATE INDEX idx_service_add_ons_addon ON service_add_ons(add_on_id);
CREATE INDEX idx_add_ons_active ON add_ons(is_active);

-- ============================================================================
-- STEP 4: ENABLE RLS (Row Level Security)
-- ============================================================================

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_add_ons ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read service_categories" ON service_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read services" ON services
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read service_pricing" ON service_pricing
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read add_ons" ON add_ons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read service_add_ons" ON service_add_ons
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage all
CREATE POLICY "Service role can manage service_categories" ON service_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage services" ON services
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage service_pricing" ON service_pricing
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage add_ons" ON add_ons
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage service_add_ons" ON service_add_ons
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
