import { useState } from "react";
import { CategoriesPanel } from "@/components/settings/CategoriesPanel";
import { TemplatesPanel } from "@/components/settings/TemplatesPanel";
import { cn } from "@/lib/utils";

export function SettingsPage({ profile, updateProfile, templates, persistTemplates, days, bulkReplaceDays }) {
  const [tab, setTab] = useState("categories");
  const [examDate, setExamDate] = useState(profile?.exam_date || "");

  const saveExamDate = async () => {
    await updateProfile({ exam_date: examDate || null });
  };

  return (
    <div className="overflow-y-auto h-full p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-2">Exam date</h2>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={saveExamDate}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-md"
          >
            Save
          </button>
        </div>
      </section>

      <div className="flex gap-1 border-b border-zinc-800 mb-4">
        {["categories", "templates"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm capitalize border-b-2 -mb-px",
              tab === t
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-100"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "categories" && (
        <CategoriesPanel profile={profile} updateProfile={updateProfile} />
      )}
      {tab === "templates" && (
        <TemplatesPanel
          templates={templates}
          persistTemplates={persistTemplates}
          days={days}
          bulkReplaceDays={bulkReplaceDays}
        />
      )}
    </div>
  );
}
