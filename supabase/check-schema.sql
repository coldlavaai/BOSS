-- Check what tables and columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'customers',
    'cars',
    'jobs',
    'email_threads',
    'email_attachments',
    'sms_messages',
    'customer_files',
    'services',
    'service_pricing',
    'customer_service_pricing',
    'job_add_ons',
    'email_integrations',
    'analytics_events'
  )
ORDER BY table_name, ordinal_position;
