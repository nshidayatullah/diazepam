import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Users, Calendar, TrendingUp, Award, Clock } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    presentToday: 0,
    offToday: 0,
    monthlyAttendance: 0,
  });
  const [topMembers, setTopMembers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

      // 1. Fetch Members
      const { data: members, error: membersError } = await supabase.from("members").select("id, name, nrp");
      if (membersError) throw membersError;

      // 2. Fetch Logs for this month (for Recent Activity)
      const { data: logs, error: logsError } = await supabase.from("attendance_logs").select("member_id, status_code, date, created_at").gte("date", startOfMonth).order("date", { ascending: false });

      if (logsError) throw logsError;

      // 3. Fetch Daily Attendance (Check-ins) for this month
      // User request: "kehadiran di dashboard apabila admin mengisi jam kehadiran"
      const { data: checkIns, error: checkInsError } = await supabase.from("daily_attendance").select("member_id, check_in_time, date").gte("date", startOfMonth).not("check_in_time", "is", null);

      if (checkInsError) throw checkInsError;

      // Process Stats based on Check-ins
      const checkInsToday = checkIns.filter((c) => c.date === today);
      const presentTodayCount = checkInsToday.length;
      const offTodayCount = members.length - presentTodayCount;
      const monthlyAttendanceCount = checkIns.length;

      // Process Leaderboard based on Check-ins
      const memberStats = {};
      members.forEach((m) => (memberStats[m.id] = { ...m, count: 0 }));

      checkIns.forEach((ci) => {
        if (memberStats[ci.member_id]) {
          memberStats[ci.member_id].count += 1;
        }
      });

      const sortedMembers = Object.values(memberStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      // Recent Activity (Use logs for context)
      const recentActivity = logs.slice(0, 5).map((log) => {
        const m = members.find((mbr) => mbr.id === log.member_id);
        return {
          ...log,
          memberName: m ? m.name : "Unknown",
        };
      });

      setStats({
        totalMembers: members.length,
        presentToday: presentTodayCount,
        offToday: offTodayCount,
        monthlyAttendance: monthlyAttendanceCount,
      });
      setTopMembers(sortedMembers);
      setRecentLogs(recentActivity);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400 text-sm">Welcome back, Admin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Members" value={stats.totalMembers} icon={<Users className="text-blue-400" />} color="border-blue-500/20 bg-blue-500/10" />
        <StatsCard title="Hadir Hari Ini" value={stats.presentToday} icon={<Clock className="text-green-400" />} color="border-green-500/20 bg-green-500/10" />
        <StatsCard title="Off / Cuti Hari Ini" value={stats.offToday} icon={<Calendar className="text-yellow-400" />} color="border-yellow-500/20 bg-yellow-500/10" />
        <StatsCard title="Total Kehadiran (Bulan Ini)" value={stats.monthlyAttendance} icon={<TrendingUp className="text-purple-400" />} color="border-purple-500/20 bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="text-yellow-500" />
                Top Rajin Bulan Ini
              </h2>
              <p className="text-slate-400 text-sm">Anggota dengan kehadiran terbanyak</p>
            </div>
          </div>

          <div className="space-y-4">
            {topMembers.map((member, index) => (
              <div key={member.id} className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-white font-medium text-sm">
                    {index + 1}. {member.name}
                  </span>
                  <span className="text-slate-400 text-xs">{member.count} Hadir</span>
                </div>
                {/* Progress Bar Background */}
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  {/* Progress Bar Fill */}
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(member.count / new Date().getDate()) * 100}%`, maxWidth: "100%" }} // Approx calc based on day of month
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Aktivitas Terbaru</h2>
          <div className="space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-slate-700 pb-3 last:border-0 last:pb-0">
                  <div className={`mt-1 w-2 h-2 rounded-full ${["DR", "DE", "NR", "NE"].includes(log.status_code) ? "bg-green-500" : "bg-slate-500"}`}></div>
                  <div>
                    <p className="text-sm text-white font-medium">{log.memberName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(log.status_code)} text-slate-900 font-bold`}>{log.status_code}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center">Belum ada data bulan ini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components & Functions
function StatsCard({ title, value, icon, color }) {
  return (
    <div className={`bg-slate-800 border rounded-lg p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-300 text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function getStatusColor(code) {
  if (["DR", "DE", "DL"].includes(code)) return "bg-blue-400";
  if (["NR", "NE", "NL"].includes(code)) return "bg-purple-400";
  if (code === "CR") return "bg-yellow-400";
  return "bg-slate-400";
}
