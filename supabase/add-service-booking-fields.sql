-- Add service booking fields for Rosie (AI agent) integration
-- duration_minutes: Appointment duration for booking slots
-- remote_bookable: Whether Rosie can book this service automatically

-- Add duration_minutes field (default to duration_hours * 60)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add remote_bookable field (default to false for safety)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS remote_bookable BOOLEAN DEFAULT false;

-- Populate duration_minutes from existing duration_hours if null
-- Convert hours to minutes (e.g., 2.5 hours = 150 minutes)
UPDATE services
SET duration_minutes = ROUND(duration_hours * 60)
WHERE duration_minutes IS NULL;

-- Make duration_minutes NOT NULL now that we've populated it
ALTER TABLE services
ALTER COLUMN duration_minutes SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN services.duration_minutes IS 'Appointment duration in minutes for booking calculations';
COMMENT ON COLUMN services.remote_bookable IS 'Whether AI agent (Rosie) can book this service automatically';

-- Add constraint to ensure duration is reasonable (5 mins to 8 hours)
ALTER TABLE services
ADD CONSTRAINT services_duration_minutes_check
CHECK (duration_minutes >= 5 AND duration_minutes <= 480);

-- Verify the changes
SELECT
  name,
  duration_hours,
  duration_minutes,
  remote_bookable,
  is_active
FROM services
ORDER BY display_order;
