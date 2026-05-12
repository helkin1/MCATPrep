import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileType,
  Loader2,
  Upload,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Button, Segmented, Textarea, Label } from "@/components/ui";

// Rough wall-clock expectation for the parse API; calibrates the progress bar
// pace. Real runs vary from ~30s for small text to several minutes for
// dense PDFs.
const PARSE_ETA_SECONDS = 120;

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const idx = res.indexOf(",");
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PlanUploader({ onParsed, onSkip, examDate, startDate }) {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [describe, setDescribe] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const startedAt = useRef(null);

  // Tick a 1-second timer while parsing so we can show elapsed time + a
  // soft progress bar pinned to an ETA. We never claim to know the actual
  // progress — just the wall-clock cost.
  useEffect(() => {
    if (!busy) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [busy]);

  const submitText = () =>
    callApi({ kind: "text", text, instructions, examDate, startDate });

  const submitDescribe = () =>
    callApi({ kind: "describe", text: describe, instructions, examDate, startDate });

  const submitFile = async (file) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    if (file.type === "application/pdf") {
      await callApi({ kind: "pdf", base64, instructions, examDate, startDate });
    } else if (file.type.startsWith("image/")) {
      await callApi({
        kind: "image",
        base64,
        mimeType: file.type,
        instructions,
        examDate,
        startDate,
      });
    } else {
      setError("Unsupported file type. Use PDF or image.");
    }
  };

  const callApi = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse plan");
      onParsed(data.parsed);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <ParsingProgress elapsed={elapsed} mode={tab} />;

  const showInstructions = tab !== "describe"; // describe IS instructions

  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { value: "text", label: "Paste", icon: FileText },
          { value: "image", label: "Screenshot", icon: ImageIcon },
          { value: "pdf", label: "PDF", icon: FileType },
          { value: "describe", label: "Describe", icon: MessageSquare },
        ]}
      />

      {tab === "text" && (
        <div className="space-y-3">
          <Textarea
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your MCAT plan here (text, CSV, weekly schedule, etc.)…"
            className="font-mono text-[12px]"
          />
        </div>
      )}

      {(tab === "image" || tab === "pdf") && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept={tab === "image" ? "image/*" : "application/pdf"}
            className="hidden"
            onChange={(e) => submitFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border-strong hover:border-accent/60 rounded-xl py-12 px-6 text-center transition-colors bg-surface-2/40 hover:bg-surface-2"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-text-2">
                <Upload size={16} />
              </div>
              <div className="text-text-1 text-[13px] font-medium">
                Click to upload {tab === "image" ? "screenshot" : "PDF"}
              </div>
              <div className="text-text-3 text-[12px]">
                {tab === "image" ? "PNG, JPG, etc." : "PDF up to 8MB"}
              </div>
            </div>
          </button>
        </div>
      )}

      {tab === "describe" && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-3 leading-relaxed">
            Describe the plan you want in plain words — Claude will draft a
            full schedule you can review and refine.
          </p>
          <Textarea
            rows={9}
            value={describe}
            onChange={(e) => setDescribe(e.target.value)}
            placeholder={`e.g., I have 14 weeks until my MCAT. First 4 weeks for content review, weeks 5–10 for practice + review, last 4 for full-lengths. CARS daily. Strongest in Psych, weakest in Physics. Mornings preferred. No study on Sundays.`}
          />
        </div>
      )}

      {showInstructions && (tab === "text" || tab === "image" || tab === "pdf") && (
        <div className="space-y-2">
          <Label>Optional instructions for Claude</Label>
          <Textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g., move CARS to mornings, skip Sundays, weight Physics heavier"
          />
        </div>
      )}

      {error && (
        <div className="text-[12px] text-danger bg-[color:var(--danger-soft)] border border-danger/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={onSkip}
          className="text-[12px] text-text-2 hover:text-text-1 transition-colors"
        >
          Skip — start with a blank calendar
        </button>
        {(tab === "text" || tab === "describe") && (
          <Button
            disabled={tab === "text" ? !text.trim() : !describe.trim()}
            onClick={tab === "text" ? submitText : submitDescribe}
            size="md"
          >
            <Sparkles size={14} />
            {tab === "text" ? "Parse with Claude" : "Generate plan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatMmSs(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function ParsingProgress({ elapsed, mode }) {
  // Easing toward 95% so the bar never claims to be done; the final 5%
  // resolves when the API actually returns.
  const ratio = Math.min(0.95, 1 - Math.exp(-elapsed / PARSE_ETA_SECONDS));
  const pct = Math.round(ratio * 100);
  const generating = mode === "describe";

  let phase = generating ? "Reading your description…" : "Reading your plan…";
  if (elapsed > 20) phase = generating ? "Drafting structure…" : "Extracting blocks…";
  if (elapsed > 60) phase = generating ? "Distributing study time…" : "Mapping to categories…";
  if (elapsed > 120) phase = "Finalizing — dense plans take a few minutes…";
  if (elapsed > 240) phase = "Still working — hang tight…";

  return (
    <div className="bg-surface-2/60 border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-medium text-text-1">
            {generating ? "Generating with Claude" : "Parsing with Claude"}
          </div>
          <div className="text-[12px] text-text-2">{phase}</div>
        </div>
        <div className="font-mono tabular text-[13px] text-text-1">
          {formatMmSs(elapsed)}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-[11px] text-text-3 leading-relaxed">
        Typically <span className="text-text-2 tabular">1–3 minutes</span>.
        Dense PDFs and full plan generation can take up to{" "}
        <span className="text-text-2 tabular">6–7 minutes</span>. Keep this tab
        open — we'll show your plan as soon as it's ready.
      </div>
    </div>
  );
}
