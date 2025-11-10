-- Create calendar_settings table for business hours and scheduling rules
-- This defines when Detail Dynamics is open for appointments

CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Hours (stored as time without timezone, e.g., '08:00:00', '18:00:00')
  monday_open TIME,
  monday_close TIME,
  monday_enabled BOOLEAN DEFAULT true,

  tuesday_open TIME,
  tuesday_close TIME,
  tuesday_enabled BOOLEAN DEFAULT true,

  wednesday_open TIME,
  wednesday_close TIME,
  wednesday_enabled BOOLEAN DEFAULT true,

  thursday_open TIME,
  thursday_close TIME,
  thursday_enabled BOOLEAN DEFAULT true,

  friday_open TIME,
  friday_close TIME,
  friday_enabled BOOLEAN DEFAULT true,

  saturday_open TIME,
  saturday_close TIME,
  saturday_enabled BOOLEAN DEFAULT true,

  sunday_open TIME,
  sunday_close TIME,
  sunday_enabled BOOLEAN DEFAULT false,

  -- Scheduling Rules
  buffer_minutes INTEGER DEFAULT 15, -- Time between appointments for cleanup
  lunch_break_start TIME, -- Optional lunch break
  lunch_break_end TIME,
  lunch_break_enabled BOOLEAN DEFAULT false,

  -- Booking Windows
  min_booking_hours INTEGER DEFAULT 24, -- Minimum hours in advance for booking
  max_booking_days INTEGER DEFAULT 30, -- How far ahead customers can book

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_calendar_settings_user_id ON calendar_settings(user_id);

-- Enable RLS
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only manage their own settings
CREATE POLICY "Users can view own calendar settings"
  ON calendar_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar settings"
  ON calendar_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar settings"
  ON calendar_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar settings"
  ON calendar_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Insert default settings for existing users
-- Monday-Friday: 8am-6pm, Saturday: 8am-2pm, Sunday: Closed
INSERT INTO calendar_settings (
  user_id,
  monday_open, monday_close, monday_enabled,
  tuesday_open, tuesday_close, tuesday_enabled,
  wednesday_open, wednesday_close, wednesday_enabled,
  thursday_open, thursday_close, thursday_enabled,
  friday_open, friday_close, friday_enabled,
  saturday_open, saturday_close, saturday_enabled,
  sunday_open, sunday_close, sunday_enabled,
  buffer_minutes,
  min_booking_hours,
  max_booking_days
)
SELECT
  id,
  '08:00:00', '18:00:00', true,  -- Monday
  '08:00:00', '18:00:00', true,  -- Tuesday
  '08:00:00', '18:00:00', true,  -- Wednesday
  '08:00:00', '18:00:00', true,  -- Thursday
  '08:00:00', '18:00:00', true,  -- Friday
  '08:00:00', '14:00:00', true,  -- Saturday (8am-2pm)
  NULL, NULL, false,             -- Sunday (closed)
  15,  -- 15 minute buffer
  24,  -- 24 hours minimum advance booking
  30   -- 30 days max booking window
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM calendar_settings WHERE calendar_settings.user_id = auth.users.id
);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_settings_updated_at
  BEFORE UPDATE ON calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_settings_updated_at();

-- Verify the table was created
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'calendar_settings'
ORDER BY ordinal_position;
