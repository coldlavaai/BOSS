-- =====================================================
-- CRITICAL PERFORMANCE INDEXES
-- Run this to dramatically improve query performance
-- =====================================================

-- 1. CUSTOMERS TABLE
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- 2. CARS TABLE
CREATE INDEX IF NOT EXISTS idx_cars_customer_id ON cars(customer_id);
CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);

-- 3. JOBS TABLE
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_car_id ON jobs(car_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_stage_id ON jobs(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_jobs_booking_datetime ON jobs(booking_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
-- Composite index for common query pattern (user + stage)
CREATE INDEX IF NOT EXISTS idx_jobs_user_stage ON jobs(user_id, pipeline_stage_id);

-- 4. EMAIL_THREADS TABLE
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_customer_id ON email_threads(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_integration_id ON email_threads(integration_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_created_at ON email_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_sent_at ON email_threads(sent_at DESC);
-- Composite index for common query pattern (user + customer)
CREATE INDEX IF NOT EXISTS idx_email_threads_user_customer ON email_threads(user_id, customer_id);

-- 5. EMAIL_ATTACHMENTS TABLE
CREATE INDEX IF NOT EXISTS idx_email_attachments_thread_id ON email_attachments(email_thread_id);

-- 6. SMS_MESSAGES TABLE
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_customer_id ON sms_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
-- Composite index for common query pattern (user + customer)
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_customer ON sms_messages(user_id, customer_id);

-- 7. CUSTOMER_FILES TABLE
CREATE INDEX IF NOT EXISTS idx_customer_files_customer_id ON customer_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_files_user_id ON customer_files(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_files_created_at ON customer_files(created_at DESC);

-- 8. SERVICES TABLE
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- 9. SERVICE_PRICING TABLE
CREATE INDEX IF NOT EXISTS idx_service_pricing_service_id ON service_pricing(service_id);

-- 10. CUSTOMER_SERVICE_PRICING TABLE
CREATE INDEX IF NOT EXISTS idx_customer_pricing_customer_id ON customer_service_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_service_id ON customer_service_pricing(service_id);
-- Composite index for pricing lookup
CREATE INDEX IF NOT EXISTS idx_customer_pricing_lookup ON customer_service_pricing(customer_id, service_id, vehicle_size);

-- 11. JOB_ADD_ONS TABLE
CREATE INDEX IF NOT EXISTS idx_job_add_ons_job_id ON job_add_ons(job_id);
CREATE INDEX IF NOT EXISTS idx_job_add_ons_add_on_id ON job_add_ons(add_on_id);

-- 12. EMAIL_INTEGRATIONS TABLE
CREATE INDEX IF NOT EXISTS idx_email_integrations_user_id ON email_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_integrations_is_active ON email_integrations(is_active);

-- 13. ANALYTICS_EVENTS TABLE (if exists)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- =====================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- =====================================================
ANALYZE customers;
ANALYZE cars;
ANALYZE jobs;
ANALYZE email_threads;
ANALYZE sms_messages;
ANALYZE customer_files;
ANALYZE services;

-- =====================================================
-- VERIFICATION QUERY
-- Run this to see all indexes
-- =====================================================
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
