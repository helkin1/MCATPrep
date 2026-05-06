import { useState } from "react";
import { CategoriesPanel } from "@/components/settings/CategoriesPanel";
import { TemplatesPanel } from "@/components/settings/TemplatesPanel";
import { Button, Input, Label, Segmented, useToast } from "@/components/ui";

export function SettingsPage({ profile, updateProfile, templates, persistTemplates, days, bulkReplaceDays }) {
  const [tab, setTab] = useState("categories");
  const [examDate, setExamDate] = useState(profile?.exam_date || "");
  const { toast } = useToast();

  const saveExamDate = async () => {
    await updateProfile({ exam_date: examDate || null });
    toast({ variant: "success", title: "Exam date saved" });
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
      </div>
    </div>
  );
}
