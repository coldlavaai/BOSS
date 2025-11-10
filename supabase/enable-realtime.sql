-- Enable Realtime for key tables
-- This allows instant sync across all parts of the CRM

-- Enable realtime on jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- Enable realtime on customers table
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Enable realtime on email_threads table
ALTER PUBLICATION supabase_realtime ADD TABLE email_threads;

-- Enable realtime on sms_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;

-- Enable realtime on customer_files table
ALTER PUBLICATION supabase_realtime ADD TABLE customer_files;

-- Verify realtime is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
