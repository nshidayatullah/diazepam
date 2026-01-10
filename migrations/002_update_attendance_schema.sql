-- Migration: Update attendance_logs table to match PPA attendance report format
-- Date: 2026-01-10

-- Add new columns to attendance_logs table
ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS status_code VARCHAR(5),
  ADD COLUMN IF NOT EXISTS job VARCHAR(10),
  ADD COLUMN IF NOT EXISTS saya_peduli VARCHAR(5);

-- Rename old columns to match new naming convention
ALTER TABLE attendance_logs 
  RENAME COLUMN clock_in TO check_in;

ALTER TABLE attendance_logs 
  RENAME COLUMN clock_out TO check_out;

-- Optional: Drop old status column if not needed
-- ALTER TABLE attendance_logs DROP COLUMN IF EXISTS status;

-- Update RLS policies to include new columns (if needed)
-- No changes needed as RLS is based on member_id, not specific columns

COMMENT ON COLUMN attendance_logs.status_code IS 'Status code from PPA: NR (No Record), DR (Day Record), AL (Annual Leave), DE (Dinas External), OL (Off/Leave), NE (Night/Evening)';
COMMENT ON COLUMN attendance_logs.job IS 'Job assignment code from PPA attendance report';
COMMENT ON COLUMN attendance_logs.saya_peduli IS 'Saya Peduli indicator (usually shows ✖ or empty)';
