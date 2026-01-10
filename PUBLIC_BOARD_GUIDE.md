# Public Attendance Board - Setup Guide

## Overview

System ini memiliki 3 komponen utama:

1. **Public Board** (`/public`) - Halaman publik untuk display attendance
2. **Daily Attendance Management** (`/daily`) - Admin page untuk input manual attendance
3. **Database** - Tabel `daily_attendance` untuk store data

## Database Setup

### Step 1: Run Migration SQL

Buka **Supabase Dashboard → SQL Editor** dan run:

```sql
-- Migration: Create daily_attendance table
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_daily_attendance_member_date
  ON daily_attendance(member_id, date DESC);

-- Enable RLS
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
```

## Usage Guide

### For Admin: Input Daily Attendance

1. Login ke aplikasi
2. Klik menu **"Daily Attendance"**
3. Pilih tanggal
4. Untuk setiap member:
   - Set **Check-in Time** (atau klik "Now" untuk jam sekarang)
   - Set **Yesterday Status** (DR, DL, NR, dll)
5. Klik **"Save All"**

### For Public Display

1. Buka `/public` di browser (no login required)
2. Display akan menampilkan:
   - 9 members dalam grid 3x3
   - Nama member
   - 3 status terakhir (history)
   - Jam check-in hari ini
   - Real-time clock

## Features

### Public Board

- ✅ Mobile-friendly responsive design
- ✅ Real-time clock display
- ✅ 9 members grid (3x3)
- ✅ Avatar untuk setiap member
- ✅ Status history (3 hari terakhir)
- ✅ Jam check-in hari ini (WITA)
- ✅ Auto-refresh setiap detik
- ✅ Smooth animations & hover effects

### Admin Page

- ✅ Date picker untuk pilih tanggal
- ✅ Time input dengan tombol "Now"
- ✅ Status code dropdown
- ✅ Bulk save semua member sekaligus
- ✅ Mobile-responsive

## Status Codes

| Code | Name           | Color      | Use Case             |
| ---- | -------------- | ---------- | -------------------- |
| DR   | Day Record     | Gray       | Normal working day   |
| DL   | Day Leave      | Green      | Day leave/present    |
| NR   | No Record      | Light Gray | No attendance record |
| AL   | Annual Leave   | Yellow     | Annual leave         |
| DE   | Dinas External | Purple     | External duty        |
| OL   | Off/Leave      | Orange     | Day off              |
| NE   | Night/Evening  | Red        | Night shift          |

## Routes

| Path          | Access    | Description              |
| ------------- | --------- | ------------------------ |
| `/public`     | Public    | Display board (no login) |
| `/daily`      | Protected | Admin input page         |
| `/`           | Protected | Dashboard                |
| `/attendance` | Protected | Attendance by member     |
| `/members`    | Protected | Manage members           |

## Customization

### Change Grid Size

Edit `PublicBoard.jsx`:

```javascript
// Line 143: Change slice(0, 9) to desired number
{attendanceData.slice(0, 12).map((record) => (

// Line 139: Adjust grid columns
<div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
```

### Change Status Colors

Edit `PublicBoard.jsx` → `getStatusColor()` function

### Change Timezone

Replace "WITA" with your timezone in:

- `PublicBoard.jsx` (line ~133, ~177)
- Display logic for time formatting

## Troubleshooting

### Public board shows "Loading..."

- Check database migration ran successfully
- Check RLS policies allow public read
- Verify `daily_attendance` table exists

### Admin can't save records

- Check authentication is working
- Verify RLS policies for INSERT/UPDATE
- Check browser console for errors

### Times not displaying

- Ensure time format is HH:MM (24-hour)
- Check `check_in_time` column type is TIME
- Verify data exists for selected date

## Mobile Optimization

The public board is optimized for:

- ✅ Portrait mode (mobile)
- ✅ Landscape mode (tablet)
- ✅ Large displays (TV/monitor)
- ✅ Touch interactions
- ✅ Responsive grid layout

---

**Ready to use!** 🎉

Public board URL: `http://localhost:5174/public`
