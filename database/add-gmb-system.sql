-- Google My Business Integration System
-- This adds GMB reviews, business profile management, and auto review requests

-- GMB Integrations (OAuth tokens and business info)
CREATE TABLE IF NOT EXISTS gmb_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Profile Info
  account_id TEXT NOT NULL, -- Google My Business account ID
  location_id TEXT NOT NULL, -- Specific business location ID
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_website TEXT,

  -- OAuth Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT true,
  auto_review_request_enabled BOOLEAN DEFAULT true,
  review_request_delay_hours INTEGER DEFAULT 24, -- Wait 24h after job completion

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  sync_from_date TIMESTAMPTZ DEFAULT (now() - interval '90 days'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gmb_integrations_unique_location UNIQUE (user_id, location_id)
);

-- GMB Reviews
CREATE TABLE IF NOT EXISTS gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES gmb_integrations(id) ON DELETE CASCADE,

  -- Review Identifiers
  review_id TEXT NOT NULL UNIQUE, -- Google's review ID
  reviewer_name TEXT,
  reviewer_profile_url TEXT,

  -- Review Content
  star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  comment TEXT,
  review_reply TEXT, -- Our reply to the review
  review_reply_at TIMESTAMPTZ, -- When we replied

  -- Metadata
  review_date TIMESTAMPTZ NOT NULL,
  is_edited BOOLEAN DEFAULT false,

  -- CRM Integration
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review Requests (track automated review request emails)
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES gmb_integrations(id) ON DELETE CASCADE,

  -- Related entities
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Request details
  email_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_url TEXT NOT NULL, -- Direct link to leave review

  -- Tracking
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMPTZ,
  review_submitted BOOLEAN DEFAULT false,
  review_submitted_at TIMESTAMPTZ,
  gmb_review_id UUID REFERENCES gmb_reviews(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT review_requests_unique_job UNIQUE (job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmb_integrations_user ON gmb_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user ON gmb_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_integration ON gmb_reviews(integration_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_rating ON gmb_reviews(star_rating);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_date ON gmb_reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_job ON review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_sent ON review_requests(email_sent_at DESC);

-- Full text search on reviews
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_comment_search ON gmb_reviews USING gin(to_tsvector('english', comment));

-- Row Level Security (RLS)
ALTER TABLE gmb_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "authenticated_gmb_integrations" ON gmb_integrations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_gmb_reviews" ON gmb_reviews
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_review_requests" ON review_requests
  FOR ALL USING (auth.role() = 'authenticated');

-- Auto-update triggers
CREATE TRIGGER update_gmb_integrations_updated_at
  BEFORE UPDATE ON gmb_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmb_reviews_updated_at
  BEFORE UPDATE ON gmb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically send review requests after job completion
-- This will be called by a cron job or webhook
CREATE OR REPLACE FUNCTION send_pending_review_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder function
  -- The actual email sending will be done via API route
  -- This function can be used to identify jobs that need review requests
  NULL;
END;
$$;
