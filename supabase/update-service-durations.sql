-- Update duration constraints and set realistic service durations
-- Based on Detail Dynamics pricing guide (using high end of ranges)

-- Remove old constraint with 480-minute (8-hour) limit
ALTER TABLE services
DROP CONSTRAINT IF EXISTS services_duration_minutes_check;

-- Add new constraint allowing up to 10,080 minutes (7 days)
ALTER TABLE services
ADD CONSTRAINT services_duration_minutes_check
CHECK (duration_minutes >= 5 AND duration_minutes <= 10080);

-- Update jobs table constraint as well
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_duration_minutes_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_duration_minutes_check
CHECK (duration_minutes IS NULL OR (duration_minutes >= 5 AND duration_minutes <= 10080));

-- Set realistic durations for each service based on pricing guide
-- Using high end of time ranges

-- Refresher Clean: 2-3 hours → 3 hours = 180 minutes
UPDATE services SET duration_minutes = 180
WHERE name = 'Refresher Clean';

-- Reset Cleanse: 4-6 hours → 6 hours = 360 minutes
UPDATE services SET duration_minutes = 360
WHERE name = 'Reset Cleanse';

-- Maintenance Plan: 1-2 hours → 2 hours = 120 minutes
UPDATE services SET duration_minutes = 120
WHERE name = 'Maintenance Plan';

-- Stage 1: 1-2 days → 2 days = 960 minutes (16 hours @ 8hr/day)
UPDATE services SET duration_minutes = 960
WHERE name = 'Stage 1: Gloss Enhancement';

-- Stage 2: 2 days → 2 days = 960 minutes
UPDATE services SET duration_minutes = 960
WHERE name = 'Stage 2: Single Step Correction';

-- Stage 3: 3 days → 3 days = 1440 minutes (24 hours)
UPDATE services SET duration_minutes = 1440
WHERE name = 'Stage 3: Multi Step Correction';

-- Stage 4: 4-5 days → 5 days = 2400 minutes (40 hours)
UPDATE services SET duration_minutes = 2400
WHERE name = 'Stage 4: Deep Correction & Scratch Removal';

-- Wheels Off Detail: 4-6 hours → 6 hours = 360 minutes
UPDATE services SET duration_minutes = 360
WHERE name = 'Wheels Off Detail';

-- New Car Protection: 1-2 days → 2 days = 960 minutes
UPDATE services SET duration_minutes = 960
WHERE name = 'New Car Protection';

-- PPF Front End Package: 2-3 days → 3 days = 1440 minutes
UPDATE services SET duration_minutes = 1440
WHERE name = 'PPF Front End Package';

-- PPF Track Pack: 3-4 days → 4 days = 1920 minutes
UPDATE services SET duration_minutes = 1920
WHERE name = 'PPF Track Pack';

-- PPF Full Vehicle Wrap: 5-7 days → 7 days = 3360 minutes (56 hours)
UPDATE services SET duration_minutes = 3360
WHERE name = 'PPF Full Vehicle Wrap';

-- PPF Interior Trim: Variable → 8 hours = 480 minutes (reasonable default)
UPDATE services SET duration_minutes = 480
WHERE name = 'PPF Interior Trim Protection';

-- Verify the updates
SELECT
  name,
  duration_text,
  duration_minutes,
  ROUND(duration_minutes / 60.0, 1) as duration_hours,
  ROUND(duration_minutes / 480.0, 1) as duration_days,
  remote_bookable
FROM services
ORDER BY display_order;
