-- File Management for Customer Documents and Email Attachments
-- Created: 2025-11-04

-- Customer Files table
CREATE TABLE IF NOT EXISTS customer_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- path in Supabase Storage

  description TEXT,
  category TEXT, -- e.g., 'invoice', 'quote', 'photo', 'document'

  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_files_customer ON customer_files(customer_id);
CREATE INDEX idx_customer_files_user ON customer_files(user_id);
CREATE INDEX idx_customer_files_category ON customer_files(category) WHERE category IS NOT NULL;

COMMENT ON TABLE customer_files IS 'Files uploaded for customers (invoices, quotes, photos, etc.)';

-- Email Attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- path in Supabase Storage

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_attachments_thread ON email_attachments(email_thread_id);

COMMENT ON TABLE email_attachments IS 'Email attachments stored in Supabase Storage';

-- Enable RLS
ALTER TABLE customer_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_files
CREATE POLICY "Users can view their own customer files"
  ON customer_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer files"
  ON customer_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer files"
  ON customer_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer files"
  ON customer_files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_attachments
CREATE POLICY "Users can view attachments for their emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_threads
      WHERE email_threads.id = email_attachments.email_thread_id
      AND email_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their emails"
  ON email_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_threads
      WHERE email_threads.id = email_attachments.email_thread_id
      AND email_threads.user_id = auth.uid()
    )
  );

-- Create storage bucket for customer files (if not exists)
-- This needs to be run via Supabase dashboard or via Storage API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('customer-files', 'customer-files', false);
