-- Add duration_minutes to jobs table for custom appointment lengths
-- This allows manual bookings to override the default service duration

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add comment
COMMENT ON COLUMN jobs.duration_minutes IS 'Appointment duration in minutes (overrides service default if set)';

-- Add constraint to ensure duration is reasonable (5 mins to 8 hours)
ALTER TABLE jobs
ADD CONSTRAINT jobs_duration_minutes_check
CHECK (duration_minutes IS NULL OR (duration_minutes >= 5 AND duration_minutes <= 480));

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name = 'duration_minutes';
