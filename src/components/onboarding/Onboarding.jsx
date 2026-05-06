import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlanUploader } from "./PlanUploader";
import { PlanPreview } from "./PlanPreview";
import { dayKey, uid } from "@/lib/time";

/**
 * Three steps:
 *   1. Set MCAT exam date
 *   2. Optionally upload existing plan → Claude parser
 *   3. Preview parsed blocks → commit to days blob
 */
export function Onboarding({ profile, updateProfile, days, bulkReplace }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(profile?.exam_date ? 2 : 1);
  const [examDate, setExamDate] = useState(profile?.exam_date || "");
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);

  const saveExamDate = async () => {
    if (!examDate) return;
    setBusy(true);
    try {
      await updateProfile({ exam_date: examDate });
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile({ onboarding_complete: true });
      navigate("/");
    } finally {
      setBusy(false);
    }
  };

  const commit = async (items) => {
    // Merge into days blob
    const next = { ...days };
    for (const it of items) {
      if (!next[it.date]) next[it.date] = { blocks: [], todos: [] };
      next[it.date] = {
        ...next[it.date],
        blocks: [
          ...next[it.date].blocks,
          {
            id: uid(),
            title: it.title,
            start: it.start,
            end: it.end,
            category: it.category,
            notes: it.notes || "",
          },
        ].sort((a, b) => a.start.localeCompare(b.start)),
      };
    }
    bulkReplace(next);
    await finish();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
            Step {step} of 3
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {step === 1 && "When is your MCAT?"}
            {step === 2 && "Got an existing plan?"}
            {step === 3 && "Review your plan"}
          </h1>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              We use this to set your countdown and limit your calendar to dates leading up to it.
            </p>
            <input
              type="date"
              value={examDate}
              min={dayKey(new Date())}
              onChange={(e) => setExamDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <button
                disabled={!examDate || busy}
                onClick={saveExamDate}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md text-sm"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Paste text/spreadsheet, drop a screenshot, or upload a PDF — Claude will turn it into
              calendar blocks you can review and edit before saving.
            </p>
            <PlanUploader
              onParsed={(p) => {
                setParsed(p);
                setStep(3);
              }}
              onSkip={finish}
            />
          </div>
        )}

        {step === 3 && parsed && (
          <PlanPreview
            parsed={parsed}
            onBack={() => setStep(2)}
            onCommit={commit}
            defaultStartDate={dayKey(new Date())}
          />
        )}
      </div>
    </div>
  );
}
