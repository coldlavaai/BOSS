-- Add missing foreign key constraints to jobs table
-- This allows PostgREST to understand the relationships for nested queries

BEGIN;

-- Check if the foreign keys already exist and add them if not
DO $$
BEGIN
    -- Add foreign key for service_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jobs_service_id_fkey'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_service_id_fkey
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE SET NULL;
    END IF;

    -- Add foreign key for customer_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jobs_customer_id_fkey'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_customer_id_fkey
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for car_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jobs_car_id_fkey'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_car_id_fkey
        FOREIGN KEY (car_id)
        REFERENCES cars(id)
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for pipeline_stage_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jobs_pipeline_stage_id_fkey'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_pipeline_stage_id_fkey
        FOREIGN KEY (pipeline_stage_id)
        REFERENCES pipeline_stages(id)
        ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;
