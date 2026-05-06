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
import { supabase } from "@/lib/supabase";

function MissingEnv() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h1 className="text-lg font-semibold mb-2">Setup required</h1>
        <p className="text-sm text-zinc-400">
          Missing Supabase env vars. Set <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_URL</code>{" "}
          and <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in{" "}
          <code className="bg-zinc-800 px-1 rounded">.env.local</code> (and Vercel for production), then restart.
        </p>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;
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
  );
}
