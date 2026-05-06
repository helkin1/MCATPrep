import { Link, useLocation } from "react-router-dom";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Settings, LogOut } from "lucide-react";

export function TopBar({ examDate }) {
  const location = useLocation();

  const countdownText = () => {
    if (!examDate) return "No exam date set";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    const days = Math.round((exam - today) / 86400000);
    if (days > 0) return `${days} days to MCAT`;
    if (days === 0) return "MCAT is today";
    return `MCAT was ${Math.abs(days)} days ago`;
  };

  const NavLink = ({ to, icon: Icon, label }) => {
    const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
          active
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
        )}
      >
        <Icon size={14} />
        {label}
      </Link>
    );
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold tracking-tight">MCAT Prep</h1>
        <span className="text-xs text-zinc-500">{countdownText()}</span>
      </div>
      <nav className="flex items-center gap-1">
        <NavLink to="/" icon={Calendar} label="Month" />
        <NavLink to="/day" icon={Clock} label="Day" />
        <NavLink to="/settings" icon={Settings} label="Settings" />
        <button
          onClick={() => signOut()}
          className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </nav>
    </header>
  );
}
