import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useDays } from "@/hooks/useDays";
import { useTemplates } from "@/hooks/useTemplates";
import { SignIn } from "@/components/auth/SignIn";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { TopBar } from "@/components/common/TopBar";
import { MonthView } from "@/components/calendar/MonthView";
import { DayView } from "@/components/day/DayView";
import { SettingsPage } from "@/pages/Settings";
import { MChatProvider } from "@/components/mchat/MChat";
import { supabase } from "@/lib/supabase";

function MissingEnv() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="max-w-md bg-surface-1 border border-border rounded-xl p-6 shadow-lg">
        <h1 className="font-display text-[18px] font-semibold tracking-tight mb-2 text-text-1">
          Setup required
        </h1>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Missing Supabase env vars. Set{" "}
          <code className="font-mono text-[12px] bg-surface-3 text-text-1 px-1.5 py-0.5 rounded">
            VITE_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="font-mono text-[12px] bg-surface-3 text-text-1 px-1.5 py-0.5 rounded">
            VITE_SUPABASE_ANON_KEY
          </code>{" "}
          in{" "}
          <code className="font-mono text-[12px] bg-surface-3 text-text-1 px-1.5 py-0.5 rounded">
            .env.local
          </code>{" "}
          (and Vercel for production), then restart.
        </p>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div
        className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-strong opacity-80"
        style={{ animation: "pulse-soft 1.4s var(--ease-in-out) infinite" }}
      />
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  if (!supabase) return <MissingEnv />;

  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, update: updateProfile } = useProfile(user?.id);
  const { days, loading: daysLoading, upsertBlock, deleteBlock, setDayTodos, bulkReplace, moveBlock } = useDays(user?.id);
  const { templates, persist: persistTemplates } = useTemplates(user?.id);

  if (authLoading) return <Loading />;
  if (!user) return <SignIn />;
  if (profileLoading || daysLoading) return <Loading />;

  const onboarded = profile?.onboarding_complete && profile?.exam_date;

  if (!onboarded) {
    return (
      <Onboarding
        profile={profile}
        updateProfile={updateProfile}
        days={days}
        bulkReplace={bulkReplace}
      />
    );
  }

  return (
    <MChatProvider
      profile={profile}
      updateProfile={updateProfile}
      days={days}
      templates={templates}
      upsertBlock={upsertBlock}
      deleteBlock={deleteBlock}
      moveBlock={moveBlock}
      setDayTodos={setDayTodos}
    >
    <div className="flex flex-col h-screen">
      <TopBar examDate={profile.exam_date} />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <MonthView
                days={days}
                examDate={profile.exam_date}
                settings={profile.settings}
                onMoveBlock={moveBlock}
              />
            }
          />
          <Route
            path="/day"
            element={<Navigate to={`/day/${new Date().toISOString().slice(0, 10)}`} replace />}
          />
          <Route
            path="/day/:date"
            element={
              <DayView
                days={days}
                settings={profile.settings}
                examDate={profile.exam_date}
                upsertBlock={upsertBlock}
                deleteBlock={deleteBlock}
                setDayTodos={setDayTodos}
                templates={templates}
                persistTemplates={persistTemplates}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                profile={profile}
                updateProfile={updateProfile}
                templates={templates}
                persistTemplates={persistTemplates}
                days={days}
                bulkReplaceDays={bulkReplace}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
    </MChatProvider>
  );
}
