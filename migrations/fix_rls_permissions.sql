-- Run this in Supabase SQL Editor to fix "Failed to save" errors

-- 1. Enable RLS on tables (if not already)
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create policies to allow Authenticated users (Admin) to Insert/Update/Delete
-- Drop likely existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all for authenticated" ON daily_attendance;
DROP POLICY IF EXISTS "Enable all for authenticated" ON attendance_logs;
DROP POLICY IF EXISTS "Allow authenticated" ON daily_attendance;
DROP POLICY IF EXISTS "Allow authenticated" ON attendance_logs;

-- Policy for daily_attendance
CREATE POLICY "Enable all for authenticated" 
ON daily_attendance 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policy for attendance_logs
CREATE POLICY "Enable all for authenticated" 
ON attendance_logs 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
