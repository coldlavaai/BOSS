-- Add columns for Gmail push notification watch tracking
ALTER TABLE email_integrations
ADD COLUMN IF NOT EXISTS watch_history_id TEXT,
ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN email_integrations.watch_history_id IS 'Gmail History ID for tracking changes since last notification';
COMMENT ON COLUMN email_integrations.watch_expiration IS 'When the Gmail watch expires (needs renewal every 7 days)';
