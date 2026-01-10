# Database Migration Guide

## Update Attendance Logs Schema

To update your Supabase database with the new schema, follow these steps:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from `migrations/002_update_attendance_schema.sql`
4. Click **Run** to execute the migration

### Option 2: Check Current Schema

Before running the migration, you can check your current schema:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance_logs';
```

### Migration SQL

```sql
-- Add new columns
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS status_code VARCHAR(5),
  ADD COLUMN IF NOT EXISTS job VARCHAR(10),
  ADD COLUMN IF NOT EXISTS saya_peduli VARCHAR(5);

-- Rename columns
ALTER TABLE attendance_logs
  RENAME COLUMN clock_in TO check_in;

ALTER TABLE attendance_logs
  RENAME COLUMN clock_out TO check_out;
```

### After Migration

After running the migration:

1. **Delete old attendance data** (optional, if you want fresh data):

   ```sql
   DELETE FROM attendance_logs;
   ```

2. **Run sync again** from the Dashboard to populate with new format

3. **Verify the data** by checking the Dashboard and Attendance by Member pages

## New Table Structure

| Column      | Type        | Description                         |
| ----------- | ----------- | ----------------------------------- |
| id          | uuid        | Primary key                         |
| member_id   | uuid        | Foreign key to members table        |
| date        | date        | Attendance date                     |
| status_code | varchar(5)  | NR, DR, AL, DE, OL, NE              |
| check_in    | varchar(10) | Check-in time (HH:MM)               |
| check_out   | varchar(10) | Check-out time (HH:MM)              |
| job         | varchar(10) | Job assignment code (e.g., MO, OFF) |
| saya_peduli | varchar(5)  | Usually "✖" or empty                |
| created_at  | timestamp   | Record creation time                |

## Status Code Meanings

- **NR** - No Record (gray)
- **DR** - Day Record (blue)
- **AL** - Annual Leave (yellow)
- **DE** - Dinas External (purple)
- **OL** - Off/Leave (orange)
- **NE** - Night/Evening (red)

## Troubleshooting

If you encounter errors:

1. **Column already exists**: If you get "column already exists" error, the migration might have been partially run. Check which columns exist and modify the SQL accordingly.

2. **Cannot rename column**: If renaming fails, you might need to:

   - Create new columns with the new names
   - Copy data from old columns
   - Drop old columns

3. **Data loss**: Always backup your data before running migrations!
   ```sql
   -- Backup existing data
   CREATE TABLE attendance_logs_backup AS SELECT * FROM attendance_logs;
   ```
