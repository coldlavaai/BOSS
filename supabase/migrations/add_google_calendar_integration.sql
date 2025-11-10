-- Create table to store Google Calendar OAuth tokens and settings
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
  calendar_name VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Create index for faster lookups
CREATE INDEX idx_google_calendar_integrations_user_id ON google_calendar_integrations(user_id);

-- Create table to track synced events
CREATE TABLE IF NOT EXISTS synced_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES google_calendar_integrations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, integration_id)
);

-- Create index for faster event lookups
CREATE INDEX idx_synced_calendar_events_job_id ON synced_calendar_events(job_id);
CREATE INDEX idx_synced_calendar_events_google_event_id ON synced_calendar_events(google_event_id);

-- RLS Policies
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only view/manage their own integrations
CREATE POLICY "Users can view their own integrations" ON google_calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations" ON google_calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" ON google_calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations" ON google_calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view synced events for their integrations
CREATE POLICY "Users can view their synced events" ON synced_calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM google_calendar_integrations
      WHERE google_calendar_integrations.id = synced_calendar_events.integration_id
      AND google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert synced events" ON synced_calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_calendar_integrations
      WHERE google_calendar_integrations.id = synced_calendar_events.integration_id
      AND google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update synced events" ON synced_calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM google_calendar_integrations
      WHERE google_calendar_integrations.id = synced_calendar_events.integration_id
      AND google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete synced events" ON synced_calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM google_calendar_integrations
      WHERE google_calendar_integrations.id = synced_calendar_events.integration_id
      AND google_calendar_integrations.user_id = auth.uid()
    )
  );
