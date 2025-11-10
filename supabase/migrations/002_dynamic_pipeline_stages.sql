-- Dynamic Pipeline Stages Migration
-- Allows Austin to fully customize kanban stages

-- Create pipeline_stages table
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280', -- Hex color for UI
  display_order INTEGER NOT NULL,
  is_archived BOOLEAN DEFAULT false, -- Special "archive" stage
  is_default BOOLEAN DEFAULT false, -- Default stage for new jobs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(display_order);
CREATE INDEX idx_pipeline_stages_archived ON pipeline_stages(is_archived);

COMMENT ON TABLE pipeline_stages IS 'Customizable kanban pipeline stages';
COMMENT ON COLUMN pipeline_stages.color IS 'Hex color code for UI display (e.g., #3B82F6)';
COMMENT ON COLUMN pipeline_stages.is_archived IS 'Special stage for archived jobs (cannot be deleted)';
COMMENT ON COLUMN pipeline_stages.is_default IS 'Default stage for new jobs';

-- Add trigger for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Modify jobs table to use pipeline_stage_id instead of status enum
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD COLUMN pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE RESTRICT;

-- Temporarily allow null for migration
ALTER TABLE jobs ALTER COLUMN status DROP NOT NULL;

-- Update existing jobs to use new pipeline_stage_id (we'll set this after seeding stages)
-- For now, jobs.status will be deprecated once we populate pipeline_stages

-- Add index for pipeline_stage_id
CREATE INDEX idx_jobs_pipeline_stage ON jobs(pipeline_stage_id);

-- Enable RLS on pipeline_stages
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access" ON pipeline_stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access" ON pipeline_stages FOR ALL USING (auth.role() = 'service_role');

-- Seed default stages (matching HighLevel workflow)
INSERT INTO pipeline_stages (name, description, color, display_order, is_archived, is_default) VALUES
  ('To Call Back', 'Leads requiring follow-up call', '#EF4444', 1, false, true),
  ('New Booking', 'Confirmed bookings awaiting service', '#3B82F6', 2, false, false),
  ('Job In Progress', 'Currently working on this job', '#F59E0B', 3, false, false),
  ('Job Completed', 'Service completed, awaiting review request', '#10B981', 4, false, false),
  ('Review Request Sent', 'Review request sent to customer', '#8B5CF6', 5, false, false),
  ('Review Received', 'Customer has left a review', '#06B6D4', 6, false, false),
  ('Archive', 'Archived jobs (older than 30 days)', '#6B7280', 999, true, false);

-- Update existing jobs to use pipeline_stage_id based on their old status
UPDATE jobs SET pipeline_stage_id = (
  SELECT id FROM pipeline_stages WHERE name =
    CASE jobs.status
      WHEN 'to_call_back' THEN 'To Call Back'
      WHEN 'new_booking' THEN 'New Booking'
      WHEN 'job_in_progress' THEN 'Job In Progress'
      WHEN 'job_completed' THEN 'Job Completed'
      WHEN 'review_request_sent' THEN 'Review Request Sent'
      WHEN 'review_received' THEN 'Review Received'
      WHEN 'archived' THEN 'Archive'
      ELSE 'To Call Back'
    END
  LIMIT 1
);

-- Make pipeline_stage_id required now that we've populated it
ALTER TABLE jobs ALTER COLUMN pipeline_stage_id SET NOT NULL;

-- Drop old status column (keep as nullable TEXT for now in case we need to reference it)
-- We'll remove it completely in a future migration after verifying everything works
COMMENT ON COLUMN jobs.status IS 'DEPRECATED: Use pipeline_stage_id instead';

-- Create function to prevent deletion of archived stage
CREATE OR REPLACE FUNCTION prevent_archive_stage_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_archived = true THEN
    RAISE EXCEPTION 'Cannot delete the archive stage';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_archive_deletion BEFORE DELETE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION prevent_archive_stage_deletion();

-- Create function to handle stage deletion (move jobs to archive)
CREATE OR REPLACE FUNCTION handle_stage_deletion()
RETURNS TRIGGER AS $$
DECLARE
  archive_stage_id UUID;
BEGIN
  -- Get archive stage ID
  SELECT id INTO archive_stage_id FROM pipeline_stages WHERE is_archived = true LIMIT 1;

  -- Move all jobs from deleted stage to archive
  UPDATE jobs SET pipeline_stage_id = archive_stage_id WHERE pipeline_stage_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER move_jobs_on_stage_deletion BEFORE DELETE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION handle_stage_deletion();

COMMENT ON FUNCTION handle_stage_deletion IS 'Automatically moves jobs to archive when their stage is deleted';
