-- Detail Dynamics CRM - Initial Database Schema
-- Created: 2025-11-03

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT,
  additional_contacts JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT customers_email_unique UNIQUE (email),
  CONSTRAINT customers_phone_unique UNIQUE (phone)
);

CREATE INDEX idx_customers_name ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

COMMENT ON TABLE customers IS 'Customer records for Detail Dynamics CRM';
COMMENT ON COLUMN customers.additional_contacts IS 'Array of additional contact info: [{"name": "John", "phone": "+44...", "email": "...", "relation": "Fleet Manager"}]';

-- Cars table
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  registration_plate TEXT,
  size_category TEXT NOT NULL CHECK (size_category IN ('Small', 'Medium', 'Large', 'XL')),
  size_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_customer ON cars(customer_id);
CREATE INDEX idx_cars_reg_plate ON cars(registration_plate);
CREATE INDEX idx_cars_make_model ON cars(make, model);

COMMENT ON TABLE cars IS 'Vehicle records linked to customers';
COMMENT ON COLUMN cars.size_override IS 'True if size was manually set, false if auto-detected';

-- Service Categories table
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_categories IS 'Service categories (Valeting, Paint Correction, etc.)';

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  duration_hours DECIMAL(4,2) NOT NULL,

  -- Pricing by car size (in pence to avoid float errors)
  price_small INTEGER NOT NULL,
  price_medium INTEGER NOT NULL,
  price_large INTEGER NOT NULL,
  price_xl INTEGER NOT NULL,

  add_ons JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT services_name_unique UNIQUE (name)
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(active) WHERE active = true;

COMMENT ON TABLE services IS 'Service catalog with pricing tiers';
COMMENT ON COLUMN services.add_ons IS 'Available add-ons: [{"name": "Engine Bay Clean", "price": 1500, "duration_hours": 0.5}]';

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  booking_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'to_call_back' CHECK (
    status IN (
      'to_call_back',
      'new_booking',
      'job_in_progress',
      'job_completed',
      'review_request_sent',
      'review_received',
      'archived'
    )
  ),

  -- Pricing (in pence)
  base_price INTEGER NOT NULL,
  add_ons_total INTEGER DEFAULT 0,
  total_price INTEGER NOT NULL,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_amount INTEGER,

  selected_add_ons JSONB DEFAULT '[]'::jsonb,

  source TEXT NOT NULL DEFAULT 'manual' CHECK (
    source IN ('manual', 'sophie', 'widget', 'phone', 'email', 'other')
  ),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Integration IDs (for future stages)
  google_calendar_event_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_car ON jobs(car_id);
CREATE INDEX idx_jobs_service ON jobs(service_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_booking_datetime ON jobs(booking_datetime);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_archived ON jobs(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_jobs_active ON jobs(status) WHERE status != 'archived';

COMMENT ON TABLE jobs IS 'Job/booking records with status tracking';
COMMENT ON COLUMN jobs.selected_add_ons IS 'Add-ons for this job: [{"name": "Engine Bay Clean", "price": 1500}]';

-- Job History table (audit log)
CREATE TABLE job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL DEFAULT 'system',
  change_type TEXT NOT NULL CHECK (
    change_type IN ('created', 'status_changed', 'updated', 'archived', 'note_added', 'email_sent', 'sms_sent')
  ),
  old_status TEXT,
  new_status TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_history_job ON job_history(job_id);
CREATE INDEX idx_job_history_created ON job_history(created_at);

COMMENT ON TABLE job_history IS 'Audit log for all job changes';

-- Vehicle Size Lookup table
CREATE TABLE vehicle_size_lookup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  size_category TEXT NOT NULL CHECK (size_category IN ('Small', 'Medium', 'Large', 'XL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_size_lookup_unique UNIQUE (make, model)
);

CREATE INDEX idx_vehicle_lookup_make_model ON vehicle_size_lookup(make, model);

COMMENT ON TABLE vehicle_size_lookup IS 'Pre-populated vehicle sizing for auto-detection';

-- Webhook Logs table
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('sophie', 'widget')),
  payload JSONB NOT NULL,
  success BOOLEAN NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  error_message TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

COMMENT ON TABLE webhook_logs IS 'Log all webhook attempts from Sophie and Widget';

-- Email Threads table (for Stage 7)
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Microsoft Graph API references
  outlook_thread_id TEXT NOT NULL,
  outlook_message_id TEXT NOT NULL,

  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',

  body_preview TEXT,
  has_attachments BOOLEAN DEFAULT false,

  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,

  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT email_threads_outlook_message_unique UNIQUE (outlook_message_id)
);

CREATE INDEX idx_email_threads_customer ON email_threads(customer_id);
CREATE INDEX idx_email_threads_job ON email_threads(job_id);
CREATE INDEX idx_email_threads_outlook_thread ON email_threads(outlook_thread_id);
CREATE INDEX idx_email_threads_received ON email_threads(received_at);
CREATE INDEX idx_email_threads_from_email ON email_threads(from_email);

COMMENT ON TABLE email_threads IS 'Email thread references from Outlook integration';

-- Email Templates table (for Stage 7)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_active ON email_templates(active) WHERE active = true;

COMMENT ON TABLE email_templates IS 'Email templates with variable substitution';
COMMENT ON COLUMN email_templates.template_variables IS 'Available variables: ["customer_name", "service_name", "booking_datetime"]';

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE settings IS 'App settings and configuration';

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_threads_updated_at BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log job status changes
CREATE OR REPLACE FUNCTION log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO job_history (job_id, change_type, new_status, changed_by)
    VALUES (NEW.id, 'created', NEW.status, 'system');
  ELSIF (OLD.status != NEW.status) THEN
    INSERT INTO job_history (job_id, change_type, old_status, new_status, changed_by)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, 'austin');

    -- Set completed_at when job is completed
    IF (NEW.status = 'job_completed' AND OLD.status != 'job_completed') THEN
      NEW.completed_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_job_changes AFTER INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_job_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_size_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users full access (will be restricted to Austin's user ID later)
CREATE POLICY "Allow authenticated access" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON cars FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON service_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON jobs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON job_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON vehicle_size_lookup FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON webhook_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON email_threads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON email_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Allow service role to bypass RLS (for webhooks)
CREATE POLICY "Allow service role full access" ON customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON cars FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON services FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON webhook_logs FOR ALL USING (auth.role() = 'service_role');

COMMENT ON POLICY "Allow authenticated access" ON customers IS 'Temporary policy - will be restricted to Austin user ID';
