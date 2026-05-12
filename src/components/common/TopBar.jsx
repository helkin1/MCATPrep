import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Clock, Settings, LogOut, Moon, Sun } from "lucide-react";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";

const NAV = [
  { to: "/", label: "Month", icon: Calendar, match: (p) => p === "/" },
  { to: "/day", label: "Day", icon: Clock, match: (p) => p.startsWith("/day") },
  { to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

function Countdown({ examDate }) {
  if (!examDate) {
    return (
      <span className="text-[11px] text-text-3 tracking-[0.04em] uppercase">
        No exam date
      </span>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const days = Math.round((exam - today) / 86400000);

  const sign = days > 0 ? "−" : days < 0 ? "+" : "";
  const value = Math.abs(days);
  const caption =
    days > 0 ? "to MCAT" : days === 0 ? "MCAT today" : "since MCAT";

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono tabular text-[13px] font-medium text-text-1">
        D{sign}
        {value}
      </span>
      <span className="text-[11px] text-text-3 uppercase tracking-[0.04em]">
        {caption}
      </span>
    </div>
  );
}

export function TopBar({ examDate }) {
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [pill, setPill] = useState(null); // { left, width }
  const { theme, toggle: toggleTheme } = useTheme();

  // Re-position the sliding pill underneath the active nav item.
  useLayoutEffect(() => {
    const active = NAV.find((n) => n.match(pathname));
    if (!active) return setPill(null);
    const el = itemRefs.current[active.to];
    const parent = navRef.current;
    if (!el || !parent) return;
    const eRect = el.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    setPill({ left: eRect.left - pRect.left, width: eRect.width });
  }, [pathname]);

  return (
    <header className="relative h-[52px] flex items-center justify-between px-6 bg-surface-1/80 backdrop-blur-md border-b border-border">
      {/* Brand + countdown */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-accent to-accent-strong shadow-sm" />
          <span className="font-display text-[14px] font-semibold tracking-tight text-text-1">
            Atara's MCAT Prep
          </span>
        </div>
        <div className="h-4 w-px bg-border-strong" />
        <Countdown examDate={examDate} />
      </div>

      {/* Centered nav with sliding underline */}
      <nav
        ref={navRef}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1"
        aria-label="Primary"
      >
        {pill && (
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] bg-accent rounded-full transition-[left,width] duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ left: pill.left, width: pill.width }}
          />
        )}
        {NAV.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              ref={(el) => (itemRefs.current[to] = el)}
              className={cn(
                "relative inline-flex items-center gap-1.5 h-[52px] px-3 text-[13px] font-medium transition-colors",
                active ? "text-text-1" : "text-text-2 hover:text-text-1"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User actions */}
      <div className="flex items-center gap-1">
        <Tooltip
          label={theme === "light" ? "Dark mode" : "Light mode"}
          side="bottom"
        >
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </Tooltip>
        <SignOutButton />
      </div>
    </header>
  );
}

/**
 * Two-step sign-out button:
 *   click #1 — expands inline to "Log out?"
 *   click #2 — signs out
 * Reverts to icon-only on outside click or after a 4s timeout, so a stray
 * click can't strand a half-confirmed state in the chrome.
 */
function SignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!confirming) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setConfirming(false);
    };
    document.addEventListener("mousedown", onDown);
    timerRef.current = setTimeout(() => setConfirming(false), 4000);
    return () => {
      document.removeEventListener("mousedown", onDown);
      clearTimeout(timerRef.current);
    };
  }, [confirming]);

  const onClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    signOut();
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={confirming ? "Confirm sign out" : "Sign out"}
      className={cn(
        "inline-flex items-center justify-center h-8 rounded-md transition-[background,color,width,padding] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        confirming
          ? "px-3 gap-1.5 bg-danger/15 text-danger hover:bg-danger/25"
          : "w-8 text-text-2 hover:text-text-1 hover:bg-surface-2"
      )}
    >
      <LogOut size={14} />
      {confirming && (
        <span className="text-[12px] font-medium whitespace-nowrap">
          Log out?
        </span>
      )}
    </button>
  );
}
