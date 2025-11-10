-- Add two-way sync toggle to google_calendar_integrations
ALTER TABLE google_calendar_integrations
ADD COLUMN IF NOT EXISTS two_way_sync_enabled BOOLEAN DEFAULT false;

-- Add column to track last sync from Google Calendar
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS last_synced_from_google TIMESTAMPTZ;
