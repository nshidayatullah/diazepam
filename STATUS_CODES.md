# PPA Attendance Status Codes

## Status Code Categories

### 🌅 ROSTER PAGI (Day Shift)

| Code   | Description       |
| ------ | ----------------- |
| **DR** | Day Roster        |
| **DL** | Day Leave         |
| **DE** | Day (Early/Extra) |

### 🌙 ROSTER MALAM (Night Shift)

| Code   | Description         |
| ------ | ------------------- |
| **NE** | Night (Early/Extra) |
| **NL** | Night Leave         |
| **NR** | Night Roster        |

### 🏖️ CUTI (Leave)

| Code   | Description |
| ------ | ----------- |
| **CR** | Cuti Roster |

### 🚫 OFF

| Code   | Description |
| ------ | ----------- |
| **OL** | Off Left    |
| **OR** | Off Right   |

### ⚠️ ALFA

| Code   | Description                      |
| ------ | -------------------------------- |
| **AL** | Alfa (Absent without permission) |

---

## Color Coding Recommendations

```
PAGI (Day):    🟢 Green tones
MALAM (Night): 🔵 Blue/Purple tones
CUTI:          🟡 Yellow tones
OFF:           ⚪ Gray tones
```

## Quick Reference

| Code | Category | Shift |
| ---- | -------- | ----- |
| DR   | PAGI     | Day   |
| DL   | PAGI     | Day   |
| DE   | PAGI     | Day   |
| NE   | MALAM    | Night |
| NL   | MALAM    | Night |
| NR   | MALAM    | Night |
| CR   | CUTI     | -     |
| OL   | OFF      | -     |
| OR   | OFF      | -     |
| AL   | ALFA     | -     |

---

## Usage in Application

Status codes are displayed in:

1. **Public Board** - 3-box display (Yesterday | Today | Tomorrow)
2. **Attendance by Member** - Full attendance log table
3. **Dashboard** - Summary views

Data source: `attendance_logs` table (synced from PPA website)
