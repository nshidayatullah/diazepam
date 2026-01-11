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
    <div className="h-screen bg-black relative isolate p-1 md:p-4 text-slate-100 flex flex-col justify-start overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Galaxy starSpeed={0.3} density={1.2} rotationSpeed={0.05} />
      </div>

      {/* Header - Compact - Flex Shrink 0 to keep size fixed */}
      <div className="flex-shrink-0 w-full max-w-6xl mx-auto mb-1 md:mb-4 text-center z-10">
        <h1 className="text-[10px] md:text-5xl font-bold text-white mb-0 md:mb-2 tracking-tight">Diazepam Group</h1>
        <h2 className="text-[8px] md:text-2xl font-medium text-blue-400 mb-0.5 md:mb-6 tracking-wide uppercase">Nice ATR • P5M Monitoring</h2>
        <div className="flex flex-col items-center justify-center">
          <div className="text-[8px] md:text-2xl text-slate-400 font-medium mb-0 md:mb-2 uppercase tracking-widest">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="text-lg md:text-6xl font-bold text-indigo-400 tracking-tight leading-none mb-0.5">
            {currentTime
              .toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })
              .replace(/:/g, ".")}{" "}
            <span className="text-[10px] md:text-3xl text-indigo-500/80 align-top">WITA</span>
          </div>
        </div>
      </div>

      {/* 3x3 Grid - Flex Grow to fill remaining space */}
      <div className="flex-grow w-full max-w-6xl mx-auto flex flex-col justify-center overflow-hidden z-10 pb-1">
        <div className="grid grid-cols-3 grid-rows-3 gap-1 md:gap-6 h-full w-full">
          {membersData.map((member) => (
            <div
              key={member.id}
              className="bg-white/[0.01] backdrop-blur-md border border-white/5 rounded md:rounded-3xl shadow-2xl p-1 md:p-4 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-300 hover:bg-white/[0.03] ring-1 ring-white/[0.02]"
            >
              {/* Shinny effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

              {/* Top Section: Avatar & Name */}
              <div className="flex flex-col items-center justify-center flex-shrink-0 w-full mt-1">
                {/* Avatar */}
                <div className="relative w-6 h-6 md:w-14 md:h-14 bg-gradient-to-br from-indigo-500/50 to-purple-600/50 rounded-full flex items-center justify-center mb-0.5 md:mb-3 shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
                  <User className="w-3 h-3 md:w-8 md:h-8 text-white/90" />
                </div>
                {/* Name */}
                <h2 className="relative text-center text-[7px] md:text-base font-medium text-white/90 mb-0 md:mb-0 line-clamp-1 px-0.5 leading-tight w-full drop-shadow-md truncate">{member.name}</h2>
                {/* NRP */}
                <div className="relative text-center text-[6px] md:text-sm text-blue-100/50 -mt-0.5 font-mono tracking-wide">{member.nrp}</div>
              </div>

              {/* Middle Section: Status Boxes */}
              <div className="relative flex gap-0.5 md:gap-2 w-full z-10 my-0.5 items-center justify-center flex-grow">
                {/* Yesterday */}
                <div className="flex-1 bg-white/[0.02] backdrop-blur-sm rounded md:rounded-xl py-0.5 md:p-2 flex flex-col items-center justify-center border border-white/[0.02] h-full max-h-[35px] md:max-h-none">
                  <div className="text-[8px] md:text-xl font-bold text-slate-300/80">{member.yesterdayStatus || "-"}</div>
                  <div className="text-[5px] md:text-xs text-slate-400/70 uppercase tracking-wider scale-75 origin-center">Kemarin</div>
                </div>

                {/* Today */}
                <div className="flex-1 bg-blue-600/40 backdrop-blur-md rounded md:rounded-xl py-0.5 md:p-2 flex flex-col items-center justify-center shadow-lg shadow-blue-500/10 transform scale-105 border border-blue-400/20 h-full max-h-[40px] md:max-h-none z-20">
                  <div className="text-[9px] md:text-2xl font-bold text-white drop-shadow-md">{member.todayStatus || "-"}</div>
                  <div className="text-[5px] md:text-xs text-blue-50/80 uppercase font-bold tracking-wider scale-75 origin-center">Hari Ini</div>
                </div>

                {/* Tomorrow */}
                <div className="flex-1 bg-white/[0.02] backdrop-blur-sm rounded md:rounded-xl py-0.5 md:p-2 flex flex-col items-center justify-center border border-white/[0.02] h-full max-h-[35px] md:max-h-none">
                  <div className="text-[8px] md:text-xl font-bold text-slate-300/80">{member.tomorrowStatus || "-"}</div>
                  <div className="text-[5px] md:text-xs text-slate-400/70 uppercase tracking-wider scale-75 origin-center">Besok</div>
                </div>
              </div>

              {/* Bottom Section: Time & Status Indicator */}
              <div className="relative w-full bg-white/[0.02] backdrop-blur-sm rounded md:rounded-2xl py-1 md:py-2 text-center mb-0.5 border border-white/[0.02] flex flex-col justify-center shadow-inner custom-shadow flex-shrink-0">
                <div className="text-[10px] md:text-3xl font-bold text-white/90 leading-none mb-0.5 drop-shadow-sm tracking-widest">{formatTime(member.todayCheckIn)}</div>
                <div className={`text-[6px] md:text-sm font-medium my-0 leading-tight ${member.todayCheckIn ? "text-emerald-300/80" : "text-rose-300/80"} drop-shadow-md scale-90 origin-center`}>
                  {member.todayCheckIn ? "Hadir P5M" : "Tidak Hadir P5M"}
                </div>

                <div className="flex items-center justify-center gap-1 opacity-80 mt-0.5 md:mt-1">
                  <span className="text-[6px] md:text-sm text-slate-300/60 font-medium tracking-wide scale-90 origin-right">Check In SS6</span>
                  {member.todayStatus ? (
                    <CheckCircle className="w-2 h-2 md:w-4 md:h-4 text-emerald-400/90 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  ) : (
                    <Hourglass className="w-2 h-2 md:w-4 md:h-4 text-amber-400/90 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer can be removed or made extremely small/invisible for public board full screen mostly */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
