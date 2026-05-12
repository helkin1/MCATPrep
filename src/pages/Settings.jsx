import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { CategoriesPanel } from "@/components/settings/CategoriesPanel";
import { TemplatesPanel } from "@/components/settings/TemplatesPanel";
import {
  Button,
  Input,
  Label,
  Segmented,
  useToast,
  useConfirm,
} from "@/components/ui";

export function SettingsPage({ profile, updateProfile, templates, persistTemplates, days, bulkReplaceDays }) {
  const [tab, setTab] = useState("categories");
  const [examDate, setExamDate] = useState(profile?.exam_date || "");
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const saveExamDate = async () => {
    await updateProfile({ exam_date: examDate || null });
    toast({ variant: "success", title: "Exam date saved" });
  };

  const restartOnboarding = async () => {
    const ok = await confirm({
      title: "Restart onboarding?",
      description:
        "You'll be sent through the welcome flow again. Your existing schedule, categories, and templates are kept — only the onboarding flag is reset.",
      confirmLabel: "Restart",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    try {
      await updateProfile({ onboarding_complete: false });
      toast({ variant: "success", title: "Onboarding reset" });
      navigate("/");
    } catch (e) {
      console.error("[settings] restartOnboarding", e);
      toast({
        variant: "error",
        title: "Couldn't restart onboarding",
        description: e.message || "Please try again.",
      });
    }
  };

  const dirty = (profile?.exam_date || "") !== examDate;

  return (
    <div className="overflow-y-auto h-full bg-bg">
      <div className="max-w-3xl mx-auto w-full p-8">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-text-1 mb-8">
          Settings
        </h1>

        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[0.06em] font-medium text-text-3 mb-3">
            Exam date
          </h2>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <p className="text-[13px] text-text-2 mb-4 leading-relaxed">
              Sets your countdown and limits the calendar to dates leading up to
              exam day.
            </p>
            <div className="flex items-end gap-3">
              <div className="max-w-[220px] flex-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <Button onClick={saveExamDate} disabled={!dirty}>
                Save
              </Button>
            </div>
          </div>
        </section>

        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: "categories", label: "Categories" },
            { value: "templates", label: "Templates" },
          ]}
          className="mb-5"
        />

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

        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.06em] font-medium text-text-3 mb-3">
            Advanced
          </h2>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="text-[13px] font-medium text-text-1">
                  Restart onboarding
                </div>
                <p className="text-[12px] text-text-2 mt-1 leading-relaxed">
                  Send yourself back through the welcome flow — useful for trying
                  new versions of the setup experience. Your schedule, categories,
                  and templates are kept.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={restartOnboarding}>
                <RotateCcw size={13} /> Restart
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
