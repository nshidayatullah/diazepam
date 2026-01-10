import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Calendar, Clock, Save, Check } from "lucide-react";

export default function ManageDailyAttendance() {
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editedTimes, setEditedTimes] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all members
    const { data: membersData } = await supabase.from("members").select("*").order("name");

    setMembers(membersData || []);

    // Fetch attendance records for selected date
    const { data: attendanceData } = await supabase.from("daily_attendance").select("*").eq("date", selectedDate);

    // Convert to object with member_id as key
    const recordsObj = {};
    (attendanceData || []).forEach((record) => {
      recordsObj[record.member_id] = record;
    });

    setAttendanceRecords(recordsObj);
    setEditedTimes({}); // Reset edited times when fetching new data
    setLoading(false);
  }, [selectedDate]);

  const handleTimeChange = (memberId, newTime) => {
    setEditedTimes((prev) => ({
      ...prev,
      [memberId]: newTime,
    }));
  };

  const handleSave = async (memberId) => {
    setSaving(true);
    const newTime = editedTimes[memberId];
    const member = members.find((m) => m.id === memberId);

    try {
      // Upsert (insert or update) the attendance record
      const { error } = await supabase.from("daily_attendance").upsert(
        {
          member_id: memberId,
          date: selectedDate,
          check_in_time: newTime,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id,date",
        }
      );

      if (error) throw error;

      // Show success message
      setSavedMessage(`✓ Saved ${member.name}'s check-in time`);
      setTimeout(() => setSavedMessage(""), 3000);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save check-in time");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Daily Attendance</h1>
          <p className="text-slate-400 text-sm">Edit attendance times for public display</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <Calendar size={20} className="text-slate-400" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white outline-none" />
          </div>
        </div>
      </div>

      {/* Success Message */}
      {savedMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 flex items-center gap-2">
          <Check size={20} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-750 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left">Member</th>
                <th className="p-4 text-left">NRP</th>
                <th className="p-4 text-left">Check-in Time</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const record = attendanceRecords[member.id] || {};
                  const currentTime = editedTimes[member.id] !== undefined ? editedTimes[member.id] : record.check_in_time || "";
                  const hasChanges = editedTimes[member.id] !== undefined && editedTimes[member.id] !== record.check_in_time;

                  return (
                    <tr key={member.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-white font-medium">{member.name}</td>
                      <td className="p-4 text-slate-400 font-mono text-sm">{member.nrp}</td>

                      {/* Check-in Time Input (Editable) */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          <input
                            type="time"
                            value={currentTime}
                            onChange={(e) => handleTimeChange(member.id, e.target.value)}
                            className="bg-slate-700 text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                          {hasChanges && <span className="text-xs text-yellow-400">• Modified</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        {hasChanges && (
                          <button
                            onClick={() => handleSave(member.id)}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                          >
                            <Save size={16} />
                            {saving ? "Saving..." : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-400">
        <p className="font-semibold mb-1">ℹ️ Information:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-300">
          <li>You can now edit check-in times manually</li>
          <li>Click "Save" button to save changes for each member</li>
          <li>Times displayed here will appear on the public board</li>
          <li>
            Public board URL:{" "}
            <a href="/public" className="underline">
              /public
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
