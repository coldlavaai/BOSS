-- Custom Variables Table
-- Allows users to define their own custom variables for email templates

CREATE TABLE IF NOT EXISTS custom_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  default_value TEXT,
  data_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'date', 'boolean', 'currency'
  format TEXT, -- For dates and currency formatting
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure variable keys are unique per user
  CONSTRAINT custom_variables_user_key_unique UNIQUE (user_id, key),

  -- Ensure key follows naming convention (lowercase, underscores, alphanumeric)
  CONSTRAINT custom_variables_key_format CHECK (key ~ '^[a-z][a-z0-9_]*$')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_variables_user ON custom_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_variables_active ON custom_variables(user_id, is_active);

-- RLS Policies
ALTER TABLE custom_variables ENABLE ROW LEVEL SECURITY;

-- Users can only see their own custom variables
CREATE POLICY "Users can view own custom variables"
  ON custom_variables FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own custom variables
CREATE POLICY "Users can create custom variables"
  ON custom_variables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom variables
CREATE POLICY "Users can update own custom variables"
  ON custom_variables FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom variables
CREATE POLICY "Users can delete own custom variables"
  ON custom_variables FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_variables_updated_at
  BEFORE UPDATE ON custom_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_variables_updated_at();

-- Company Settings Table (for company information variables)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_address TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  company_registration_number TEXT,
  company_vat_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for company settings
CREATE INDEX IF NOT EXISTS idx_company_settings_user ON company_settings(user_id);

-- RLS Policies for company settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company settings"
  ON company_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings"
  ON company_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings"
  ON company_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company settings"
  ON company_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update company_settings updated_at
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_variables_updated_at();

-- Add some example custom variables for reference
COMMENT ON TABLE custom_variables IS 'User-defined custom variables for email templates. Examples: technician_name, warranty_period, next_service_date';
COMMENT ON COLUMN custom_variables.key IS 'Variable key in format: custom.variable_name (lowercase, underscores only)';
COMMENT ON COLUMN custom_variables.data_type IS 'Data type: string, number, date, boolean, or currency';
COMMENT ON COLUMN custom_variables.format IS 'Format string for dates (date-fns format) or currency code (e.g., GBP, USD)';
