-- Fix RLS policies for job_add_ons table
-- Allow authenticated users to insert their own job add-ons

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read job_add_ons" ON job_add_ons;
DROP POLICY IF EXISTS "Service role can manage job_add_ons" ON job_add_ons;

-- Allow authenticated users to read all job add-ons
CREATE POLICY "authenticated_select_job_add_ons" ON job_add_ons
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert job add-ons
CREATE POLICY "authenticated_insert_job_add_ons" ON job_add_ons
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete job add-ons
CREATE POLICY "authenticated_delete_job_add_ons" ON job_add_ons
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Service role can do everything
CREATE POLICY "service_role_all_job_add_ons" ON job_add_ons
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
