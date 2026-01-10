import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import * as cheerio from "cheerio";
import { User, Calendar, Clock, RefreshCw, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

// CORS Proxy URL
const PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const TARGET_URL = "https://absen.ppa-bib.net/index.php/monitoring/my_attendance";

export default function AttendanceByMember() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("members").select("*").order("name");

    if (error) {
      console.error("Error fetching members:", error);
    } else {
      setMembers(data || []);
      if (data && data.length > 0) {
        setSelectedMemberId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchAttendanceLogs = async (memberId) => {
    setLogsLoading(true);
    const { data, error } = await supabase.from("attendance_logs").select("*").eq("member_id", memberId).order("date", { ascending: false });

    if (error) {
      console.error("Error fetching attendance logs:", error);
    } else {
      setAttendanceLogs(data || []);
    }
    setLogsLoading(false);
  };

  const syncMember = async (member) => {
    const formData = new FormData();
    formData.append("p_nrp", member.nrp);

    try {
      const response = await axios.post(PROXY_URL + TARGET_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const $ = cheerio.load(response.data);
      const rows = $("table tbody tr");

      const attendanceRecords = [];
      rows.each((index, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 6) {
          const dateText = $(cells[0]).text().trim();
          const statusCode = $(cells[1]).text().trim();
          const checkIn = $(cells[2]).text().trim();
          const checkOut = $(cells[3]).text().trim();
          const job = $(cells[4]).text().trim();
          const sayaPeduli = $(cells[5]).text().trim();

          const dateParts = dateText.split("/");
          if (dateParts.length === 3) {
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

            attendanceRecords.push({
              date: formattedDate,
              member_id: member.id,
              status_code: statusCode || null,
              check_in: checkIn || null,
              check_out: checkOut || null,
              job: job || null,
              saya_peduli: sayaPeduli || null,
            });
          }
        }
      });

      if (attendanceRecords.length > 0) {
        const { error: upsertError } = await supabase.from("attendance_logs").upsert(attendanceRecords, { onConflict: "member_id,date" });

        if (upsertError) {
          console.error(`Error upserting for ${member.name}:`, upsertError);
          return { success: false, name: member.name };
        }
      }

      return { success: true, name: member.name, count: attendanceRecords.length };
    } catch (error) {
      console.error(`Error syncing ${member.name}:`, error);
      return { success: false, name: member.name };
    }
  };

  const handleSyncAll = async () => {
    if (members.length === 0) {
      setSyncStatus({ type: "error", message: "No members to sync." });
      return;
    }

    setSyncing(true);
    setSyncStatus({ type: "info", message: "Starting sync..." });

    const results = [];
    for (const member of members) {
      const result = await syncMember(member);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    setSyncing(false);

    if (failCount === 0) {
      setSyncStatus({
        type: "success",
        message: `Successfully synced ${successCount} members!`,
      });
    } else {
      setSyncStatus({
        type: "error",
        message: `Synced ${successCount} members. Failed: ${failCount}`,
      });
    }

    // Refresh the logs for selected member if any
    if (selectedMemberId) {
      await fetchAttendanceLogs(selectedMemberId);
    }

    setTimeout(() => setSyncStatus(null), 5000);
  };

  useEffect(() => {
    fetchMembers(); // eslint-disable-line
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchAttendanceLogs(selectedMemberId); // eslint-disable-line
    }
  }, [selectedMemberId]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const totalDays = attendanceLogs.length;
  const presentDays = attendanceLogs.filter((log) => log.check_in && log.check_in !== "-").length;
  const absentDays = totalDays - presentDays;

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance by Member</h1>
          <p className="text-slate-400 text-sm">View individual attendance records</p>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              <span>Sync All Attendance</span>
            </>
          )}
        </button>
      </div>

      {/* Sync Status Alert */}
      {syncStatus && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            syncStatus.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : syncStatus.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}
        >
          {syncStatus.type === "success" ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : syncStatus.type === "error" ? (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <Loader2 size={20} className="flex-shrink-0 mt-0.5 animate-spin" />
          )}
          <span className="font-medium">{syncStatus.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">No members found. Please add members first.</div>
      ) : (
        <>
          {/* Stepper Navigation */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              {/* Previous Button */}
              <button
                onClick={() => {
                  const currentIndex = members.findIndex((m) => m.id === selectedMemberId);
                  if (currentIndex > 0) {
                    setSelectedMemberId(members[currentIndex - 1].id);
                  }
                }}
                disabled={members.findIndex((m) => m.id === selectedMemberId) === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={20} />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Current Member Indicator */}
              <div className="flex items-center gap-3 text-center px-4">
                <div className="flex items-center gap-2 text-white">
                  <User size={20} className="text-indigo-400" />
                  <div>
                    <div className="font-bold text-lg">{selectedMember?.name}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      Member {members.findIndex((m) => m.id === selectedMemberId) + 1} of {members.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => {
                  const currentIndex = members.findIndex((m) => m.id === selectedMemberId);
                  if (currentIndex < members.length - 1) {
                    setSelectedMemberId(members[currentIndex + 1].id);
                  }
                }}
                disabled={members.findIndex((m) => m.id === selectedMemberId) === members.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Member Info & Stats */}
            {selectedMember && (
              <div className="p-6 bg-slate-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedMember.name}</h2>
                    <p className="text-slate-400 font-mono text-sm">NRP: {selectedMember.nrp}</p>
                  </div>

                  {/* Statistics Cards */}
                  <div className="flex gap-4">
                    <div className="bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600">
                      <div className="text-xs text-slate-400 mb-1">Total Days</div>
                      <div className="text-2xl font-bold text-white">{totalDays}</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg px-4 py-3 border border-emerald-500/30">
                      <div className="text-xs text-emerald-400 mb-1">Present</div>
                      <div className="text-2xl font-bold text-emerald-400">{presentDays}</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/30">
                      <div className="text-xs text-red-400 mb-1">Absent</div>
                      <div className="text-2xl font-bold text-red-400">{absentDays}</div>
                    </div>
                  </div>
                </div>

                {/* Attendance Logs Table */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-750 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4">
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>Date</span>
                            </div>
                          </th>
                          <th className="p-4">#</th>
                          <th className="p-4">
                            <div className="flex items-center space-x-2">
                              <Clock size={14} />
                              <span>Check In</span>
                            </div>
                          </th>
                          <th className="p-4">
                            <div className="flex items-center space-x-2">
                              <Clock size={14} />
                              <span>Check Out</span>
                            </div>
                          </th>
                          <th className="p-4">Job</th>
                          <th className="p-4">Saya Peduli</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {logsLoading ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500">
                              Loading attendance data...
                            </td>
                          </tr>
                        ) : attendanceLogs.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500">
                              No attendance records found for this member.
                            </td>
                          </tr>
                        ) : (
                          attendanceLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="p-4 text-white font-medium">{log.date}</td>
                              <td className="p-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold ${
                                    log.status_code === "DR"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : log.status_code === "NR"
                                      ? "bg-gray-500/20 text-gray-400"
                                      : log.status_code === "AL"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : log.status_code === "DE"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : log.status_code === "OL"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : log.status_code === "NE"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-slate-700 text-slate-400"
                                  }`}
                                >
                                  {log.status_code || "-"}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`font-mono ${log.check_in && log.check_in !== "" ? "text-emerald-400" : "text-slate-500"}`}>{log.check_in || "-"}</span>
                              </td>
                              <td className="p-4">
                                <span className={`font-mono ${log.check_out && log.check_out !== "" ? "text-amber-400" : "text-slate-500"}`}>{log.check_out || "-"}</span>
                              </td>
                              <td className="p-4 text-slate-300">{log.job || "-"}</td>
                              <td className="p-4 text-center">{log.saya_peduli && log.saya_peduli.includes("✖") ? <span className="text-red-500 text-lg">✖</span> : <span className="text-slate-600">-</span>}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
