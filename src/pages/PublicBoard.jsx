import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { User, CheckCircle, Hourglass } from "lucide-react";
import Footer from "../components/Footer";
import Galaxy from "../components/Galaxy";

export default function PublicBoard() {
  const [membersData, setMembersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchMembersWithAttendance = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    // Get first 9 members ordered by NRP
    const { data: members } = await supabase.from("members").select("*").order("nrp").limit(9);

    if (!members) {
      setLoading(false);
      return;
    }

    // For each member, get attendance data
    const membersWithData = await Promise.all(
      members.map(async (member) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        // Get yesterday's status from attendance_logs (PPA sync)
        const { data: yesterdayLog } = await supabase.from("attendance_logs").select("status_code").eq("member_id", member.id).eq("date", yesterdayStr).order("created_at", { ascending: false }).limit(1).maybeSingle();

        // Get today's status from attendance_logs (PPA sync)
        const { data: todayLog } = await supabase.from("attendance_logs").select("status_code").eq("member_id", member.id).eq("date", today).order("created_at", { ascending: false }).limit(1).maybeSingle();

        // Get today's check-in time from daily_attendance (manual admin input)
        const { data: dailyAttendance } = await supabase.from("daily_attendance").select("check_in_time").eq("member_id", member.id).eq("date", today).maybeSingle();

        // Get tomorrow's status from attendance_logs (PPA sync)
        const { data: tomorrowLog } = await supabase.from("attendance_logs").select("status_code").eq("member_id", member.id).eq("date", tomorrowStr).order("created_at", { ascending: false }).limit(1).maybeSingle();

        return {
          ...member,
          yesterdayStatus: yesterdayLog?.status_code || null,
          todayCheckIn: dailyAttendance?.check_in_time || null,
          todayStatus: todayLog?.status_code || null,
          tomorrowStatus: tomorrowLog?.status_code || null,
        };
      })
    );

    setMembersData(membersWithData);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch
    // eslint-disable-next-line
    fetchMembersWithAttendance();

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Supabase Realtime Subscription
    // Listen to changes on 'daily_attendance' (Time inputs) and 'attendance_logs' (Status syncs)
    const channel = supabase
      .channel("public-board-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_attendance" }, () => {
        console.log("Realtime update: daily_attendance changed");
        fetchMembersWithAttendance(); // Background refresh without loading spinner
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" }, () => {
        console.log("Realtime update: attendance_logs changed");
        fetchMembersWithAttendance(); // Background refresh without loading spinner
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchMembersWithAttendance]);

  const formatTime = (time) => {
    if (!time) return "--:--";
    // time format is HH:MM:SS, we want HH:MM
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-2xl text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative isolate p-1 md:p-4 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Galaxy starSpeed={0.3} density={1.2} rotationSpeed={0.05} />
      </div>

      {/* Header - Ultra compact for mobile */}
      <div className="max-w-6xl mx-auto mb-1 md:mb-6 text-center">
        <h1 className="text-sm md:text-5xl font-bold text-white mb-0.5 md:mb-2 tracking-tight">Diazepam Group</h1>
        <h2 className="text-xs md:text-2xl font-medium text-blue-400 mb-2 md:mb-6 tracking-wide uppercase">Nice ATR • P5M Monitoring</h2>
        <div className="flex flex-col items-center justify-center">
          <div className="text-[10px] md:text-2xl text-slate-400 font-medium mb-1 md:mb-2 uppercase tracking-widest">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="text-xl md:text-6xl font-bold text-indigo-400 tracking-tight leading-none">
            {currentTime
              .toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })
              .replace(/:/g, ".")}{" "}
            <span className="text-sm md:text-3xl text-indigo-500/80 align-top">WITA</span>
          </div>
        </div>
      </div>

      {/* 3x3 Grid - Ultra compact */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-1 md:gap-6">
          {membersData.map((member) => (
            <div key={member.id} className="bg-slate-800 border border-slate-700 rounded md:rounded-3xl shadow-lg p-1 md:p-6 flex flex-col items-center">
              {/* Avatar - smaller on mobile */}
              <div className="w-7 h-7 md:w-14 md:h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-1 md:mb-3 shadow-md">
                <User className="w-4 h-4 md:w-8 md:h-8 text-white" />
              </div>

              {/* Name - very small on mobile */}
              <h2 className="text-center text-[8px] md:text-base font-normal text-white mb-0 md:mb-0 line-clamp-2 px-0.5 leading-tight h-[1.2rem] md:min-h-[2.5rem] flex items-end justify-center pb-1">{member.name}</h2>

              {/* NRP - below name */}
              <div className="text-center text-[7px] md:text-sm text-slate-400 mb-0.5 md:mb-2 -mt-1">{member.nrp}</div>
              {/* 3 Status Boxes: Yesterday | Today | Tomorrow */}
              <div className="flex gap-0.5 md:gap-2 mb-0.5 md:mb-4 w-full">
                {/* Yesterday - Gray */}
                <div className="flex-1 bg-slate-700/50 rounded md:rounded-xl p-0.5 md:p-2 flex flex-col items-center justify-center border border-slate-600">
                  <div className="text-[10px] md:text-xl font-bold text-slate-300">{member.yesterdayStatus || "-"}</div>
                  <div className="text-[6px] md:text-xs text-slate-500 uppercase">Kemarin</div>
                </div>

                {/* Today - Blue (Active) */}
                <div className="flex-1 bg-blue-600 rounded md:rounded-xl p-0.5 md:p-2 flex flex-col items-center justify-center shadow-lg shadow-blue-900/20 transform scale-105 border border-blue-500">
                  <div className="text-[11px] md:text-2xl font-bold text-white">{member.todayStatus || "-"}</div>
                  <div className="text-[6px] md:text-xs text-blue-100 uppercase font-bold">Hari Ini</div>
                </div>

                {/* Tomorrow - Gray */}
                <div className="flex-1 bg-slate-700/50 rounded md:rounded-xl p-0.5 md:p-2 flex flex-col items-center justify-center border border-slate-600">
                  <div className="text-[10px] md:text-xl font-bold text-slate-300">{member.tomorrowStatus || "-"}</div>
                  <div className="text-[6px] md:text-xs text-slate-500 uppercase">Besok</div>
                </div>
              </div>

              {/* Today's Check-in Time - compact */}
              <div className="bg-slate-700/50 rounded md:rounded-2xl py-1 md:py-2 text-center w-full mb-0.5 md:mb-2 border border-slate-600 flex flex-col justify-center">
                <div className="text-sm md:text-3xl font-bold text-white leading-none mb-0.5">{formatTime(member.todayCheckIn)}</div>
                <div className={`text-[7px] md:text-sm font-medium my-0 md:my-0.5 leading-tight ${member.todayCheckIn ? "text-green-400" : "text-red-400"}`}>{member.todayCheckIn ? "Hadir P5M" : "Tidak Hadir P5M"}</div>

                <div className="flex items-center justify-center gap-1 opacity-80">
                  <span className="text-[7px] md:text-sm text-slate-400">Check In SS6</span>
                  {member.todayStatus ? <CheckCircle className="w-2 h-2 md:w-4 md:h-4 text-green-500" /> : <Hourglass className="w-2 h-2 md:w-4 md:h-4 text-yellow-500 animate-pulse" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - visible on all screens, explicit small size */}
      <Footer className="max-w-6xl mx-auto !text-[10px] !mt-4 !py-2 opacity-70" />
    </div>
  );
}
