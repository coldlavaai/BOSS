-- Event tracking table for user actions and system performance
-- Tracks: registration, job creation, customer creation, errors, performance

BEGIN;

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event identification
  event_type TEXT NOT NULL, -- 'job_created', 'customer_added', 'registration_completed', etc.
  event_category TEXT NOT NULL, -- 'user_action', 'system_event', 'error', 'performance'

  -- Event details
  event_data JSONB, -- Flexible metadata (service_id, customer_id, etc.)

  -- Performance metrics
  duration_ms INTEGER, -- How long the action took (milliseconds)

  -- Context
  page_path TEXT, -- Which page the event occurred on
  user_agent TEXT, -- Browser/device info

  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT, -- If success=false, what went wrong

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_success ON events(success);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "authenticated_insert_events" ON events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to read their own events
CREATE POLICY "authenticated_select_own_events" ON events
  FOR SELECT
  USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Allow service role to read all events (for analytics dashboard)
CREATE POLICY "service_role_all_events" ON events
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;

-- Sample queries for analytics:

-- Average time to create a job
-- SELECT AVG(duration_ms) as avg_duration_ms FROM events WHERE event_type = 'job_created' AND success = true;

-- Success rate by event type
-- SELECT event_type,
--        COUNT(*) as total,
--        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
--        ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
-- FROM events
-- GROUP BY event_type;

-- Events per day
-- SELECT DATE(created_at) as date, event_type, COUNT(*) as count
-- FROM events
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE(created_at), event_type
-- ORDER BY date DESC;

-- Slowest operations
-- SELECT event_type, MAX(duration_ms) as max_ms, AVG(duration_ms) as avg_ms
-- FROM events
-- WHERE duration_ms IS NOT NULL
-- GROUP BY event_type
-- ORDER BY avg_ms DESC;
