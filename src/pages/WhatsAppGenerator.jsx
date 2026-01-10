import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { MessageSquare, Copy, Check, RefreshCw } from "lucide-react";

export default function WhatsAppGenerator() {
  const [reportData, setReportData] = useState({
    shift1: [],
    shift2: [],
    cuti: [],
    off: [],
  });
  const [generatedText, setGeneratedText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch data
  const fetchData = async () => {
    try {
      // 1. Get all members
      const { data: members, error: membersError } = await supabase.from("members").select("*").order("nrp");
      if (membersError) throw membersError;

      // 2. Get attendance logs for selected date
      const { data: logs, error: logsError } = await supabase.from("attendance_logs").select("member_id, status_code").eq("date", selectedDate);
      if (logsError) throw logsError;

      // 3. Get check-in times
      const { data: daily, error: dailyError } = await supabase.from("daily_attendance").select("member_id, check_in_time").eq("date", selectedDate);
      if (dailyError) throw dailyError;

      // Create lookups
      const logsMap = {};
      logs.forEach((log) => {
        logsMap[log.member_id] = log.status_code;
      });

      const checkInMap = {};
      daily.forEach((d) => {
        if (d.check_in_time) {
          checkInMap[d.member_id] = d.check_in_time;
        }
      });

      // 3. Categorize members
      const shift1 = [];
      const shift2 = [];
      const cuti = [];
      const off = [];

      // Auto-assign Night Roster (NR/NE) to Shift 2 initially?
      // User request implies manual separation or specific grouping.
      // Let's rely on status codes first if they indicate shift.

      // Based on STATUS_CODES.md:
      // PAGI (Day): DR, DL, DE
      // MALAM (Night): NE, NL, NR

      // However, usually report separates by ACTUAL shift worked.

      members.forEach((member) => {
        const code = logsMap[member.id] || "NR"; // Default to NR (Night Roster) or Unknown? Or maybe Empty.

        let targetGroup = "off"; // Default group

        // Logic mapping
        if (["DR", "DE", "DL"].includes(code)) {
          // Day Shift codes
          targetGroup = "shift1";
        } else if (["NR", "NE", "NL"].includes(code)) {
          // Night Shift codes
          targetGroup = "shift2";
        } else if (["CR"].includes(code)) {
          // Cuti codes
          targetGroup = "cuti";
        } else {
          // Other codes (OL, OR, AL) -> Off
          targetGroup = "off";
        }

        // Create member object for UI
        // Convert to Title Case
        let displayName = member.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

        // Add Check-in time suffix if available, BUT ONLY for Shift 1 (DR, DE, DL)
        const checkInTime = checkInMap[member.id];
        const isShift1Code = ["DR", "DE", "DL"].includes(code);

        if (checkInTime && isShift1Code) {
          // Format HH:MM:SS -> HH.MM
          const formattedTime = checkInTime.substring(0, 5).replace(":", ".");
          displayName += ` (Hadir ${formattedTime})`;
        }

        const memberObj = {
          id: member.id,
          name: displayName,
          code: code,
          isShift2: targetGroup === "shift2", // For manual toggle
        };

        if (targetGroup === "shift1") shift1.push(memberObj);
        else if (targetGroup === "shift2") shift2.push(memberObj);
        else if (targetGroup === "cuti") cuti.push(memberObj);
        else off.push(memberObj);
      });

      setReportData({ shift1, shift2, cuti, off });
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      // Done
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Regenerate text whenever data changes
  useEffect(() => {
    generateWhatsAppText();
  }, [reportData, selectedDate]);

  const toggleShift = (memberId, currentGroup) => {
    const newData = { ...reportData };
    let member;

    // Find and remove member from current group
    if (currentGroup === "shift1") {
      const idx = newData.shift1.findIndex((m) => m.id === memberId);
      if (idx > -1) {
        member = newData.shift1.splice(idx, 1)[0];
        // Move to shift 2
        member.isShift2 = true;
        newData.shift2.push(member);
      }
    } else if (currentGroup === "shift2") {
      const idx = newData.shift2.findIndex((m) => m.id === memberId);
      if (idx > -1) {
        member = newData.shift2.splice(idx, 1)[0];
        // Move to shift 1
        member.isShift2 = false;
        newData.shift1.push(member);
      }
    }

    // Sort logic (optional, keep alphabetical or original order?)
    // For now simple push is fine.

    setReportData(newData);
  };

  const generateWhatsAppText = () => {
    const dateOptions = { day: "numeric", month: "long", year: "numeric" };
    const formattedDate = new Date(selectedDate).toLocaleDateString("id-ID", dateOptions);

    let text = `*📍UPDATE KEHADIRAN SHENERGY*\n\n`;
    text += `*${formattedDate}*\n`;
    text += `*Kelompok 4 (Diazepam Group)*\n\n`; // Updated per request

    // Shift 1
    text += `_*Shift 1*_\n`;
    if (reportData.shift1.length > 0) {
      reportData.shift1.forEach((m, i) => {
        text += `${i + 1}. ${m.name}\n`;
      });
    } else {
      text += `-\n`;
    }
    text += `\n`;

    // Shift 2
    text += `_*Shift 2*_\n`;
    if (reportData.shift2.length > 0) {
      reportData.shift2.forEach((m, i) => {
        text += `${i + 1}. ${m.name}\n`;
      });
    } else {
      text += `-\n`;
    }
    text += `\n`;

    // Cuti
    text += `_*Cuti*_\n`;
    if (reportData.cuti.length > 0) {
      reportData.cuti.forEach((m, i) => {
        text += `${i + 1}. ${m.name}\n`;
      });
    } else {
      text += `-\n`;
    }
    text += `\n`;

    // Off
    text += `_*Off*_\n`;
    if (reportData.off.length > 0) {
      reportData.off.forEach((m, i) => {
        // Optional: Add status code for context? e.g. Reza J (Cuti)
        // User example didn't show code, just names.
        text += `${i + 1}. ${m.name}\n`;
      });
    } else {
      text += `-\n`;
    }

    text += `\nTerimakasih 🙏🏻`;

    setGeneratedText(text);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Report Generator</h1>
          <p className="text-slate-400 text-sm">Generate attendance summary for WhatsApp</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Member Management */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Member Grouping</h2>
            <button onClick={fetchData} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700">
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Shift 1 List */}
          <div>
            <h3 className="text-blue-400 text-sm font-medium mb-2 uppercase">Shift 1 (Pagi)</h3>
            <div className="space-y-2 bg-slate-900/50 p-2 rounded-lg min-h-[50px]">
              {reportData.shift1.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                  <span className="text-white text-sm">{member.name}</span>
                  <button onClick={() => toggleShift(member.id, "shift1")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded">
                    Move to Shift 2 →
                  </button>
                </div>
              ))}
              {reportData.shift1.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No members</p>}
            </div>
          </div>

          {/* Shift 2 List */}
          <div>
            <h3 className="text-purple-400 text-sm font-medium mb-2 uppercase">Shift 2 (Malam)</h3>
            <div className="space-y-2 bg-slate-900/50 p-2 rounded-lg min-h-[50px]">
              {reportData.shift2.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                  <span className="text-white text-sm">{member.name}</span>
                  <button onClick={() => toggleShift(member.id, "shift2")} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded">
                    ← Move to Shift 1
                  </button>
                </div>
              ))}
              {reportData.shift2.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No members</p>}
            </div>
          </div>

          {/* Cuti List */}
          <div>
            <h3 className="text-yellow-400 text-sm font-medium mb-2 uppercase">Cuti</h3>
            <div className="space-y-2 bg-slate-900/50 p-2 rounded-lg min-h-[50px]">
              {reportData.cuti.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 opacity-75">
                  <span className="text-white text-sm">{member.name}</span>
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">{member.code || "N/A"}</span>
                </div>
              ))}
              {reportData.cuti.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No members</p>}
            </div>
          </div>

          {/* Off List */}
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-2 uppercase">Off</h3>
            <div className="space-y-2 bg-slate-900/50 p-2 rounded-lg min-h-[50px]">
              {reportData.off.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 opacity-75">
                  <span className="text-white text-sm">{member.name}</span>
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">{member.code || "N/A"}</span>
                </div>
              ))}
              {reportData.off.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No members</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Copy */}
        <div className="order-first md:order-last">
          <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-green-400">
                <MessageSquare size={20} />
                <h2 className="font-semibold">Preview Generator</h2>
              </div>
              <button onClick={handleCopy} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${copySuccess ? "bg-green-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}>
                {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                {copySuccess ? "Copied!" : "Copy Text"}
              </button>
            </div>

            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full h-[400px] bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed outline-none focus:border-green-500/50 resize-none selection:bg-green-900 selection:text-white"
              spellCheck="false"
            />

            <p className="mt-2 text-xs text-slate-500 text-center">You can edit the text above manually before copying.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
