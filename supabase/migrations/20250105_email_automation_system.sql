-- Email Automation System Schema
-- Comprehensive email signatures, templates, and automation

-- Email Signatures Table
CREATE TABLE IF NOT EXISTS email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_default BOOLEAN DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual', -- 'gmail', 'outlook', 'manual'
  integration_id UUID REFERENCES email_integrations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default signature per user
CREATE UNIQUE INDEX idx_one_default_signature_per_user
ON email_signatures (user_id)
WHERE is_default = true;

CREATE INDEX idx_email_signatures_user ON email_signatures(user_id);
CREATE INDEX idx_email_signatures_source ON email_signatures(source);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'booking_confirmation', 'reminder', 'follow_up', 'custom', 'pipeline_change'
  subject_template TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  signature_id UUID REFERENCES email_signatures(id) ON DELETE SET NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available variables for this template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_user ON email_templates(user_id);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

-- Email Automation Rules Table
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'job_created', 'job_status_change', 'time_before_booking', 'job_completed', 'manual'
  trigger_config JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- job_status_change: {"from_stage_id": "uuid", "to_stage_id": "uuid"}
  -- time_before_booking: {"hours_before": 24, "run_time": "09:00"}
  -- job_created: {"service_types": ["uuid1", "uuid2"]}
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '{}'::jsonb, -- Additional filter conditions
  is_active BOOLEAN DEFAULT true,
  send_to_customer BOOLEAN DEFAULT true,
  send_to_additional JSONB DEFAULT '[]'::jsonb, -- Additional email addresses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_user ON email_automation_rules(user_id);
CREATE INDEX idx_automation_rules_trigger ON email_automation_rules(trigger_type);
CREATE INDEX idx_automation_rules_active ON email_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_template ON email_automation_rules(template_id);

-- Email Automation Logs Table
CREATE TABLE IF NOT EXISTS email_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES email_automation_rules(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email_thread_id UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_to TEXT[], -- Email addresses sent to
  variables_used JSONB, -- Snapshot of variables at send time
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_logs_rule ON email_automation_logs(rule_id);
CREATE INDEX idx_automation_logs_job ON email_automation_logs(job_id);
CREATE INDEX idx_automation_logs_customer ON email_automation_logs(customer_id);
CREATE INDEX idx_automation_logs_status ON email_automation_logs(status);
CREATE INDEX idx_automation_logs_created ON email_automation_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_signatures
CREATE POLICY "Users can view their own signatures"
  ON email_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signatures"
  ON email_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures"
  ON email_signatures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures"
  ON email_signatures FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_templates
CREATE POLICY "Users can view their own templates"
  ON email_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_automation_rules
CREATE POLICY "Users can view their own automation rules"
  ON email_automation_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation rules"
  ON email_automation_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules"
  ON email_automation_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules"
  ON email_automation_rules FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_automation_logs
CREATE POLICY "Users can view logs for their automation rules"
  ON email_automation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_automation_rules
      WHERE email_automation_rules.id = email_automation_logs.rule_id
      AND email_automation_rules.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = email_automation_logs.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_email_signatures_updated_at
  BEFORE UPDATE ON email_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automation_rules_updated_at
  BEFORE UPDATE ON email_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default signature per user
CREATE OR REPLACE FUNCTION ensure_one_default_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset any other default signatures for this user
    UPDATE email_signatures
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_one_default_signature_trigger
  BEFORE INSERT OR UPDATE ON email_signatures
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_one_default_signature();

-- Add default template variables as a reference
COMMENT ON COLUMN email_templates.variables IS 'Available variables: customer_name, customer_email, customer_phone, customer_business, job_id, service_name, booking_date, booking_time, booking_datetime, total_price, deposit_amount, car_make, car_model, car_year, car_registration, company_name, company_phone, company_email, technician_name';
