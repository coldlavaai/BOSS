-- Add webhook channel fields to google_calendar_integrations
ALTER TABLE google_calendar_integrations
ADD COLUMN IF NOT EXISTS watch_channel_id TEXT,
ADD COLUMN IF NOT EXISTS watch_resource_id TEXT,
ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMPTZ;

-- Add index for quick lookup by channel ID
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_channel_id
ON google_calendar_integrations(watch_channel_id);
