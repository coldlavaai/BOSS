-- Add column to control whether to sync all mail or only customer emails
ALTER TABLE email_integrations
ADD COLUMN IF NOT EXISTS sync_all_mail BOOLEAN DEFAULT true;

COMMENT ON COLUMN email_integrations.sync_all_mail IS 'When true, syncs all emails. When false, only syncs emails from/to CRM customers';
