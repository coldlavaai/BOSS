-- Create job_add_ons junction table to track which add-ons are selected for each job

BEGIN;

CREATE TABLE IF NOT EXISTS job_add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, add_on_id)
);

CREATE INDEX idx_job_add_ons_job ON job_add_ons(job_id);
CREATE INDEX idx_job_add_ons_addon ON job_add_ons(add_on_id);

-- Enable RLS
ALTER TABLE job_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read job_add_ons" ON job_add_ons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage job_add_ons" ON job_add_ons
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
