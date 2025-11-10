-- =====================================================
-- COMMUNICATIONS SYSTEM - Email, SMS, WhatsApp
-- =====================================================
-- Supports: Outlook, Gmail, Office 365, SMS (Twilio), WhatsApp
-- Created: 2025-11-04
-- =====================================================

-- 1. EMAIL INTEGRATIONS (Multiple providers)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('outlook', 'gmail', 'office365')),
  email_address TEXT NOT NULL,
  display_name TEXT,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Provider-specific IDs
  provider_user_id TEXT, -- Microsoft user ID or Google user ID

  -- Sync settings
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  sync_from_date TIMESTAMPTZ DEFAULT (now() - interval '30 days'), -- Only sync emails from this date

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT email_integrations_unique_provider UNIQUE (user_id, provider, email_address)
);

CREATE INDEX idx_email_integrations_user ON email_integrations(user_id);
CREATE INDEX idx_email_integrations_provider ON email_integrations(provider);
CREATE INDEX idx_email_integrations_active ON email_integrations(is_active) WHERE is_active = true;

-- 2. EMAIL THREADS (Unified email storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES email_integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Customer/Job linking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Provider-specific IDs
  provider TEXT NOT NULL CHECK (provider IN ('outlook', 'gmail', 'office365')),
  provider_message_id TEXT NOT NULL, -- Outlook message ID or Gmail message ID
  provider_thread_id TEXT, -- For threading conversations

  -- Email metadata
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',

  subject TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  body_html TEXT, -- HTML version

  -- Attachments (stored as JSONB array)
  -- [{name: "invoice.pdf", size: 12345, contentType: "application/pdf", downloadUrl: "..."}]
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false, -- true if sent from CRM, false if received
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT email_threads_unique_message UNIQUE (provider, provider_message_id)
);

CREATE INDEX idx_email_threads_integration ON email_threads(integration_id);
CREATE INDEX idx_email_threads_user ON email_threads(user_id);
CREATE INDEX idx_email_threads_customer ON email_threads(customer_id);
CREATE INDEX idx_email_threads_job ON email_threads(job_id);
CREATE INDEX idx_email_threads_provider_message ON email_threads(provider, provider_message_id);
CREATE INDEX idx_email_threads_thread ON email_threads(provider_thread_id);
CREATE INDEX idx_email_threads_from ON email_threads(from_email);
CREATE INDEX idx_email_threads_received ON email_threads(received_at DESC);
CREATE INDEX idx_email_threads_sent ON email_threads(sent_at DESC);
CREATE INDEX idx_email_threads_unread ON email_threads(is_read) WHERE is_read = false;

-- 3. EMAIL TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,

  -- Variables supported: {{customer_name}}, {{service_name}}, {{booking_datetime}}, {{total_price}}, etc.
  variables TEXT[] DEFAULT '{}', -- List of variables used in this template

  category TEXT CHECK (category IN ('booking_confirmation', 'reminder', 'thank_you', 'review_request', 'custom')),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_user ON email_templates(user_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

-- 4. SMS MESSAGES (Twilio)
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Customer/Job linking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Phone numbers (E.164 format: +447700900000)
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,

  -- Message content
  body TEXT NOT NULL,

  -- Twilio metadata
  twilio_message_sid TEXT UNIQUE,
  twilio_status TEXT, -- queued, sent, delivered, failed, etc.
  twilio_error_code TEXT,
  twilio_error_message TEXT,

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Status
  is_read BOOLEAN DEFAULT false,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_messages_user ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_customer ON sms_messages(customer_id);
CREATE INDEX idx_sms_messages_job ON sms_messages(job_id);
CREATE INDEX idx_sms_messages_to ON sms_messages(to_number);
CREATE INDEX idx_sms_messages_from ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX idx_sms_messages_created ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_unread ON sms_messages(is_read) WHERE is_read = false;

-- 5. WHATSAPP MESSAGES (Twilio WhatsApp API)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Customer/Job linking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- WhatsApp numbers (E.164 format with whatsapp: prefix)
  from_number TEXT NOT NULL, -- whatsapp:+447700900000
  to_number TEXT NOT NULL,

  -- Message content
  body TEXT NOT NULL,

  -- Media attachments (WhatsApp supports images, videos, documents)
  -- [{type: "image", url: "...", contentType: "image/jpeg"}]
  media JSONB DEFAULT '[]'::jsonb,

  -- Twilio metadata
  twilio_message_sid TEXT UNIQUE,
  twilio_status TEXT, -- queued, sent, delivered, read, failed, etc.
  twilio_error_code TEXT,
  twilio_error_message TEXT,

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Status
  is_read BOOLEAN DEFAULT false,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_user ON whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_customer ON whatsapp_messages(customer_id);
CREATE INDEX idx_whatsapp_messages_job ON whatsapp_messages(job_id);
CREATE INDEX idx_whatsapp_messages_to ON whatsapp_messages(to_number);
CREATE INDEX idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_unread ON whatsapp_messages(is_read) WHERE is_read = false;

-- 6. COMMUNICATION PREFERENCES (Customer settings)
-- =====================================================
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Preferred contact methods (in order of preference)
  preferred_methods TEXT[] DEFAULT ARRAY['email', 'sms', 'whatsapp'],

  -- Opt-in/out
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  marketing_opt_in BOOLEAN DEFAULT false,

  -- Notification preferences
  booking_confirmations BOOLEAN DEFAULT true,
  reminders BOOLEAN DEFAULT true,
  review_requests BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT communication_preferences_unique_customer UNIQUE (customer_id)
);

CREATE INDEX idx_communication_preferences_customer ON communication_preferences(customer_id);

-- 7. AUTO-UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_integrations_updated_at BEFORE UPDATE ON email_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_threads_updated_at BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON sms_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_communication_preferences_updated_at BEFORE UPDATE ON communication_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_own_email_integrations" ON email_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_email_threads" ON email_threads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_email_templates" ON email_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_sms_messages" ON sms_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_communication_preferences" ON communication_preferences
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Service role has full access
CREATE POLICY "service_role_email_integrations" ON email_integrations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_email_threads" ON email_threads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_email_templates" ON email_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_sms_messages" ON sms_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_communication_preferences" ON communication_preferences
  FOR ALL USING (auth.role() = 'service_role');
