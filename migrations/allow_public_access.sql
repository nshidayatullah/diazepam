-- Allow Public (Anon) Read Access for Public Board
-- Run this in Supabase SQL Editor

-- 1. Members Table
DROP POLICY IF EXISTS "Allow public read access" ON members;
CREATE POLICY "Allow public read access" 
ON members FOR SELECT 
TO anon, authenticated 
USING (true);

-- 2. Daily Attendance Table
DROP POLICY IF EXISTS "Allow public read access" ON daily_attendance;
CREATE POLICY "Allow public read access" 
ON daily_attendance FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Attendance Logs Table
DROP POLICY IF EXISTS "Allow public read access" ON attendance_logs;
CREATE POLICY "Allow public read access" 
ON attendance_logs FOR SELECT 
TO anon, authenticated 
USING (true);
