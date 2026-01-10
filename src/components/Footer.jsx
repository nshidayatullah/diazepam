export default function Footer({ className = "" }) {
  return (
    <div className={`mt-12 text-center text-slate-100 text-sm py-4 ${className}`}>
      <p>Nice ATR • Real-time Attendance Monitor • Real-time updates enabled</p>
      <p className="text-[10px] text-slate-400 mt-2 select-none font-mono">Code by Hidayatullah</p>
    </div>
  );
}
