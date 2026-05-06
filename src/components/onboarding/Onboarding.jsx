import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlanUploader } from "./PlanUploader";
import { PlanPreview } from "./PlanPreview";
import { dayKey, uid } from "@/lib/time";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-bg overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(900px 500px at 50% -10%, rgba(124,156,255,0.10), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-2xl">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-accent to-accent-strong shadow-sm" />
          <span className="font-display text-[13px] font-semibold tracking-tight text-text-1">
            Atara's MCAT Prep
          </span>
        </div>

        <div className="bg-surface-1/80 backdrop-blur-xl border border-border rounded-2xl p-7 shadow-xl space-y-6">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={cn(
                  "h-1 rounded-full transition-[width,background] duration-[var(--dur-base)] ease-[var(--ease-out)]",
                  n === step
                    ? "w-8 bg-accent"
                    : n < step
                    ? "w-4 bg-accent/60"
                    : "w-4 bg-surface-3"
                )}
              />
            ))}
            <span className="ml-2 text-[11px] text-text-3 tabular tracking-[0.04em] uppercase">
              Step {step} of 3
            </span>
          </div>

          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-text-1 leading-tight">
              {step === 1 && "When is your MCAT?"}
              {step === 2 && "Got an existing plan?"}
              {step === 3 && "Review your plan"}
            </h1>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-[13px] text-text-2 leading-relaxed">
                We'll use this to set your countdown and limit your calendar to
                dates leading up to it.
              </p>
              <div className="max-w-[240px]">
                <Label>Exam date</Label>
                <Input
                  type="date"
                  value={examDate}
                  min={dayKey(new Date())}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!examDate || busy}
                  onClick={saveExamDate}
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-[13px] text-text-2 leading-relaxed">
                Paste text or a spreadsheet, drop a screenshot, or upload a PDF —
                Claude will turn it into calendar blocks you can review and edit
                before saving.
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
    </div>
  );
}
