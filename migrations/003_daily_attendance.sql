-- Migration: Create daily_attendance table for manual attendance input
-- Date: 2026-01-10

-- Create daily_attendance table
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME,
  status_code VARCHAR(5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_attendance_member_date 
  ON daily_attendance(member_id, date DESC);

-- Enable RLS
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" 
  ON daily_attendance FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
  ON daily_attendance FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" 
  ON daily_attendance FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" 
  ON daily_attendance FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_daily_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_attendance_updated_at
  BEFORE UPDATE ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_attendance_updated_at();

COMMENT ON TABLE daily_attendance IS 'Manual daily attendance records for public display';
COMMENT ON COLUMN daily_attendance.check_in_time IS 'Check-in time for today (manual input)';
COMMENT ON COLUMN daily_attendance.status_code IS 'Yesterday status code: DR, DL, NR, etc';
