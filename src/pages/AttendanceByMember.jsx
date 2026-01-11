import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import * as cheerio from "cheerio";
import { User, Calendar, Clock, RefreshCw, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

// CORS Proxy URL
// CORS Proxy URL (Handled by Vite Proxy in dev)
const PROXY_URL = "";
// Use local proxy path defined in vite.config.js
const TARGET_URL = "/api-ppa/index.php/monitoring/my_attendance";

export default function AttendanceByMember() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const [isAutoSync, setIsAutoSync] = useState(false);

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

      console.log(`Syncing ${member.name}... Response Status:`, response.status);

      const $ = cheerio.load(response.data);
      const pageTitle = $("title").text().trim();
      console.log(`Page Title: ${pageTitle}`);

      // Target the specific data table class '.tbl-abs'
      // Based on HTML provided: <table class="table table-bordered table-striped tbl-abs">
      const targetRows = $(".tbl-abs tbody tr");

      // Check if it's a login page if no target rows are found
      if (targetRows.length === 0) {
        const bodyText = $("body").text().toLowerCase();
        if (bodyText.includes("login") || bodyText.includes("sign in") || bodyText.includes("masuk")) {
          return { success: false, name: member.name, error: "Session Expired (Login Page)" };
        }
        return { success: false, name: member.name, error: `No data found. Title: ${pageTitle}` };
      }

      console.log(`Processing ${targetRows.length} rows from .tbl-abs table.`);

      let firstRowDebugging = "";
      const attendanceRecords = [];

      targetRows.each((index, row) => {
        const rowText = $(row).text().replace(/\s+/g, " ").trim();
        if (index < 3) console.log(`Row ${index}: ${rowText.substring(0, 100)}`); // Debug first 3 rows

        if (index === 0) firstRowDebugging = rowText;

        const cells = $(row).find("td");

        // Skip rows that don't have enough columns (Data rows have 6 columns)
        // 0: Date, 1: Status (NR, DR), 2: In, 3: Out, 4: Job, 5: Saya Peduli
        if (cells.length < 6) return;

        const dateText = $(cells[0]).text().trim();

        // Simple validation: dateText must look like date (YYYY-MM-DD or contains -)
        if (!dateText.includes("-")) return;

        const statusCode = $(cells[1]).text().trim();
        const checkIn = $(cells[2]).text().trim();
        const checkOut = $(cells[3]).text().trim();
        const job = $(cells[4]).text().trim();

        // "Saya Peduli" column contains HTML (icon/tooltip), so we just check for 'times' class or similar if needed.
        // Or just store raw text/html marker
        const sayaPeduliHtml = $(cells[5]).html() || "";
        const sayaPeduli = sayaPeduliHtml.includes("fa-times") ? "✖" : "-";

        // Date in HTML is already YYYY-MM-DD (e.g., 2026-01-13)
        // No need to split/reverse if it matches YYYY-MM-DD format
        let formattedDate = dateText;

        // Double check format
        const dateParts = dateText.split("-");
        if (dateParts.length === 3) {
          attendanceRecords.push({
            date: formattedDate,
            member_id: member.id,
            status_code: statusCode || null,
            check_in: checkIn || null,
            check_out: checkOut || null,
            job: job || null,
            saya_peduli: sayaPeduli,
          });
        }
      });

      // Find latest date for debugging
      let latestDateFound = "-";
      if (attendanceRecords.length > 0) {
        latestDateFound = attendanceRecords[0].date; // Assumes order is desc or first row is latest
      }

      if (attendanceRecords.length === 0) {
        return { success: false, name: member.name, error: `Parse failed. Rows: ${targetRows.length}. Sample: [${firstRowDebugging}]` };
      }

      console.log(`Parsed ${attendanceRecords.length} valid records for ${member.name}. Latest: ${latestDateFound}`);

      if (attendanceRecords.length > 0) {
        const { error: upsertError } = await supabase.from("attendance_logs").upsert(attendanceRecords, { onConflict: "member_id,date" });

        if (upsertError) {
          console.error(`Error upserting for ${member.name}:`, upsertError);
          return { success: false, name: member.name, error: "Database Error" };
        }
      }

      return { success: true, name: member.name, count: attendanceRecords.length, latestDate: latestDateFound };
    } catch (error) {
      console.error(`Error syncing ${member.name}:`, error);
      return { success: false, name: member.name, error: error.message };
    }
  };

  const handleSyncAll = async () => {
    if (members.length === 0) {
      setSyncStatus({ type: "error", message: "No members to sync." });
      return;
    }

    setSyncing(true);
    setSyncStatus({ type: "info", message: "Starting sync... check console for details." });

    const results = [];
    for (const member of members) {
      const result = await syncMember(member);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success);
    const failCount = failures.length;

    // Check latest dates
    const latestDates = results.map((r) => r.latestDate).filter((d) => d && d !== "-");
    const uniqueDates = [...new Set(latestDates)].slice(0, 3).join(", "); // Show top 3 distinct dates found

    setSyncing(false);

    if (failCount === 0) {
      setSyncStatus({
        type: "success",
        message: `Synced ${successCount} members! Latest Data: ${uniqueDates}`,
      });
    } else {
      // Extract unique error messages
      const errorMessages = [...new Set(failures.map((f) => f.error))].join(", ");
      const isCorsError = errorMessages.includes("403") || errorMessages.includes("Network Error");

      setSyncStatus({
        type: "error",
        message: `Synced ${successCount}. Fail: ${failCount}. Errors: ${errorMessages}. Latest Data found: ${uniqueDates}`,
        link: isCorsError ? "https://cors-anywhere.herokuapp.com/corsdemo" : null,
      });
    }

    // Refresh the logs for selected member if any
    if (selectedMemberId) {
      await fetchAttendanceLogs(selectedMemberId);
    }

    // Increase timeout for error reading
    setTimeout(() => setSyncStatus(null), 15000);
  };

  // Auto-Sync Logic (Moved below definition)
  useEffect(() => {
    let interval;
    if (isAutoSync) {
      // Run immediately on enable? Optional. Let's just wait for interval.
      interval = setInterval(() => {
        if (!syncing) {
          console.log("Auto-sync triggered...");
          handleSyncAll();
        }
      }, 300000); // 5 minutes (300,000 ms)
    }
    return () => clearInterval(interval);
  }, [isAutoSync, syncing]);

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

        {/* Auto Sync Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAutoSync(!isAutoSync)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition border ${
              isAutoSync ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${isAutoSync ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <span>{isAutoSync ? "Auto-Sync: ON (5m)" : "Auto-Sync: OFF"}</span>
          </button>

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
          <div className="flex flex-col gap-1">
            <span className="font-medium">{syncStatus.message}</span>
            {syncStatus.link && (
              <a href={syncStatus.link} target="_blank" rel="noopener noreferrer" className="underline font-bold text-xs uppercase hover:text-white mt-1 block">
                👉 Click here to activate Proxy Access (Required)
              </a>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">No members found. Please add members first.</div>
      ) : (
        <>
          {/* Main Layout: Vertical Tabs (Left) + Content (Right) */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar: Member List Tabs */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
                    selectedMemberId === member.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-full ${selectedMemberId === member.id ? "bg-white/20" : "bg-slate-700"}`}>
                    <User size={16} />
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-sm truncate">{member.name}</div>
                    <div className={`text-xs ${selectedMemberId === member.id ? "text-blue-200" : "text-slate-500"} font-mono`}>{member.nrp}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Content: Member Detail & Table */}
            <div className="flex-1 min-w-0">
              {selectedMember ? (
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">{selectedMember.name}</h2>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">NRP: {selectedMember.nrp}</span>
                        </div>
                      </div>

                      {/* Statistics Cards */}
                      <div className="flex gap-2">
                        <div className="bg-slate-700/50 rounded-lg px-3 py-2 border border-slate-600 min-w-[80px]">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total</div>
                          <div className="text-xl font-bold text-white">{totalDays}</div>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/30 min-w-[80px]">
                          <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Present</div>
                          <div className="text-xl font-bold text-emerald-400">{presentDays}</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/30 min-w-[80px]">
                          <div className="text-[10px] text-red-400 uppercase tracking-wider">Absent</div>
                          <div className="text-xl font-bold text-red-400">{absentDays}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Logs Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-750 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                        <tr>
                          <th className="p-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>Date</span>
                            </div>
                          </th>
                          <th className="p-4 whitespace-nowrap">Status</th>
                          <th className="p-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {/* <Clock size={14} /> */}
                              <span>Check In</span>
                            </div>
                          </th>
                          <th className="p-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {/* <Clock size={14} /> */}
                              <span>Check Out</span>
                            </div>
                          </th>
                          <th className="p-4 whitespace-nowrap">Job</th>
                          <th className="p-4 whitespace-nowrap">Saya Peduli</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {logsLoading ? (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-slate-500">
                              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                              Loading data...
                            </td>
                          </tr>
                        ) : attendanceLogs.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-slate-500">
                              No attendance records found.
                            </td>
                          </tr>
                        ) : (
                          attendanceLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-700/30 transition-colors text-sm">
                              <td className="p-4 text-white font-medium whitespace-nowrap">{log.date}</td>
                              <td className="p-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-bold inline-block min-w-[30px] text-center ${
                                    log.status_code === "DR"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : log.status_code === "DL"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : log.status_code === "DE"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : log.status_code === "NE"
                                      ? "bg-indigo-500/20 text-indigo-400"
                                      : log.status_code === "NL"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : log.status_code === "NR"
                                      ? "bg-indigo-500/20 text-indigo-400" // Night Regular treated as valid now
                                      : log.status_code === "AL"
                                      ? "bg-red-500/20 text-red-500"
                                      : log.status_code === "OL"
                                      ? "bg-slate-600/30 text-slate-400"
                                      : "bg-slate-700 text-slate-400"
                                  }`}
                                >
                                  {log.status_code || "-"}
                                </span>
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <span className={`font-mono ${log.check_in && log.check_in !== "" ? "text-emerald-400" : "text-slate-600"}`}>{log.check_in || "-"}</span>
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <span className={`font-mono ${log.check_out && log.check_out !== "" ? "text-amber-400" : "text-slate-600"}`}>{log.check_out || "-"}</span>
                              </td>
                              <td className="p-4 text-slate-300 max-w-[200px] truncate" title={log.job}>
                                {log.job || "-"}
                              </td>
                              <td className="p-4 text-center">{log.saya_peduli && log.saya_peduli.includes("✖") ? <span className="text-red-500 font-bold">✖</span> : <span className="text-slate-600">-</span>}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-lg p-12 text-center text-slate-500 border border-slate-700 flex flex-col items-center justify-center h-full min-h-[400px]">
                  <User size={48} className="mb-4 opacity-20" />
                  <p>Select a member from the list to view attendance details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
