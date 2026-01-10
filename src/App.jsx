import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Dashboard from "./pages/Dashboard";
import ManageMembers from "./pages/ManageMembers";
import AttendanceByMember from "./pages/AttendanceByMember";
import ManageDailyAttendance from "./pages/ManageDailyAttendance";
import PublicBoard from "./pages/PublicBoard";
import WhatsAppGenerator from "./pages/WhatsAppGenerator";
import Login from "./pages/Login";
import { LayoutDashboard, LogOut, Menu, MessageSquare, UserCircle, Users, ClipboardCheck } from "lucide-react";
import Footer from "./components/Footer";
import clsx from "clsx";

// Protected Route Component
const ProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return <Layout />;
};

// Layout Component with Sidebar/Navbar
const Layout = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-800 border-r border-slate-700">
        <div className="p-4 text-xl font-bold text-blue-400">Nice ATR</div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavLink to="/attendance" icon={<UserCircle size={20} />} label="Attendance by Member" />
          <NavLink to="/daily" icon={<ClipboardCheck size={20} />} label="Daily Attendance" />
          <NavLink to="/whatsapp" icon={<MessageSquare size={20} />} label="WA Generator" />
          <NavLink to="/members" icon={<Users size={20} />} label="Manage Members" />
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-400 hover:text-white w-full px-4 py-2 rounded-md hover:bg-slate-700 transition">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
          <div className="font-bold text-blue-400">Nice ATR</div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
            <Menu size={24} />
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700">
            <nav className="p-4 space-y-2">
              <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />
              <NavLink to="/attendance" icon={<UserCircle size={20} />} label="Attendance by Member" onClick={() => setIsMobileMenuOpen(false)} />
              <NavLink to="/daily" icon={<ClipboardCheck size={20} />} label="Daily Attendance" onClick={() => setIsMobileMenuOpen(false)} />
              <NavLink to="/whatsapp" icon={<MessageSquare size={20} />} label="WA Generator" onClick={() => setIsMobileMenuOpen(false)} />
              <NavLink to="/members" icon={<Users size={20} />} label="Manage Members" onClick={() => setIsMobileMenuOpen(false)} />
              <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-400 hover:text-white w-full px-4 py-2 rounded-md hover:bg-slate-700 transition">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 overflow-auto relative">
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  );
};

const NavLink = ({ to, icon, label, onClick }) => (
  <Link to={to} onClick={onClick} className={clsx("flex items-center space-x-3 px-4 py-3 rounded-md transition", "text-slate-300 hover:bg-slate-700 hover:text-white")}>
    {icon}
    <span>{label}</span>
  </Link>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/public" element={<PublicBoard />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<AttendanceByMember />} />
          <Route path="/daily" element={<ManageDailyAttendance />} />
          <Route path="/whatsapp" element={<WhatsAppGenerator />} />
          <Route path="/members" element={<ManageMembers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
