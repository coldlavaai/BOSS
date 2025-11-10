-- Clear all test data (jobs and customers)
-- Keeps configuration data (services, add-ons, categories, stages, pricing)

BEGIN;

-- Delete all synced calendar events
DELETE FROM synced_calendar_events;

-- Delete all job add-ons (will also cascade when jobs are deleted, but doing explicitly)
DELETE FROM job_add_ons;

-- Delete all jobs
DELETE FROM jobs;

-- Delete all cars (will cascade from customers, but doing explicitly)
DELETE FROM cars;

-- Delete all customers
DELETE FROM customers;

-- Reset sequences if needed (optional - for clean IDs starting from 1)
-- Note: We're using UUIDs so this isn't necessary, but included for completeness

COMMIT;

-- Verify cleanup
SELECT
    (SELECT COUNT(*) FROM jobs) as jobs_count,
    (SELECT COUNT(*) FROM customers) as customers_count,
    (SELECT COUNT(*) FROM cars) as cars_count,
    (SELECT COUNT(*) FROM job_add_ons) as job_add_ons_count,
    (SELECT COUNT(*) FROM synced_calendar_events) as synced_events_count;

-- Should see all zeros
