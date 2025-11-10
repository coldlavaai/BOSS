-- Customer Documents Table
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  source TEXT, -- 'email_attachment', 'manual_upload', 'sms', etc.
  source_message_id TEXT, -- Reference to email_threads.id or sms_messages.id
  notes TEXT,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT, -- 'booking', 'follow_up', 'quote', 'invoice', 'general'
  variables JSONB, -- Available template variables
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quick Responses Table
CREATE TABLE IF NOT EXISTS quick_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL, -- e.g., '/thanks', '/followup'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quick_responses_shortcut_unique UNIQUE (user_id, shortcut)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_job ON customer_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_user ON customer_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_v2_user ON email_templates_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_v2_category ON email_templates_v2(category);
CREATE INDEX IF NOT EXISTS idx_quick_responses_user ON quick_responses(user_id);

-- RLS Policies
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_responses ENABLE ROW LEVEL SECURITY;

-- Customer Documents Policies
CREATE POLICY "Users can view own documents"
  ON customer_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents"
  ON customer_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON customer_documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON customer_documents FOR DELETE
  USING (user_id = auth.uid());

-- Email Templates Policies
CREATE POLICY "Users can view own templates"
  ON email_templates_v2 FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own templates"
  ON email_templates_v2 FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON email_templates_v2 FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON email_templates_v2 FOR DELETE
  USING (user_id = auth.uid());

-- Quick Responses Policies
CREATE POLICY "Users can view own quick responses"
  ON quick_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own quick responses"
  ON quick_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quick responses"
  ON quick_responses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own quick responses"
  ON quick_responses FOR DELETE
  USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_documents_modtime
    BEFORE UPDATE ON customer_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_email_templates_v2_modtime
    BEFORE UPDATE ON email_templates_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_quick_responses_modtime
    BEFORE UPDATE ON quick_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Insert some default templates
INSERT INTO email_templates_v2 (user_id, name, subject, body_html, body_text, category, is_default)
SELECT
  auth.uid(),
  'Booking Confirmation',
  'Your booking is confirmed - {{service_name}}',
  '<p>Hi {{customer_name}},</p><p>Your booking for {{service_name}} is confirmed for {{booking_date}} at {{booking_time}}.</p><p>We look forward to seeing you!</p><p>Best regards,<br>{{business_name}}</p>',
  'Hi {{customer_name}},\n\nYour booking for {{service_name}} is confirmed for {{booking_date}} at {{booking_time}}.\n\nWe look forward to seeing you!\n\nBest regards,\n{{business_name}}',
  'booking',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates_v2 WHERE user_id = auth.uid());

-- Insert some default quick responses
INSERT INTO quick_responses (user_id, shortcut, title, content)
SELECT
  auth.uid(),
  '/thanks',
  'Thank You',
  'Thank you for your message! I''ll get back to you shortly.'
WHERE NOT EXISTS (SELECT 1 FROM quick_responses WHERE user_id = auth.uid() AND shortcut = '/thanks');

INSERT INTO quick_responses (user_id, shortcut, title, content)
SELECT
  auth.uid(),
  '/followup',
  'Follow Up',
  'Just following up on my previous message. Please let me know if you have any questions.'
WHERE NOT EXISTS (SELECT 1 FROM quick_responses WHERE user_id = auth.uid() AND shortcut = '/followup');
