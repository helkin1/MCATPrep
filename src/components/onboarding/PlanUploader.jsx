import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, FileType, Loader2, Upload, Sparkles } from "lucide-react";
import { Button, Segmented, Textarea } from "@/components/ui";

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

export function PlanUploader({ onParsed, onSkip }) {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
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

  const submitText = async () => {
    if (!text.trim()) return;
    await callApi({ kind: "text", text });
  };

  const submitFile = async (file) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    if (file.type === "application/pdf") {
      await callApi({ kind: "pdf", base64 });
    } else if (file.type.startsWith("image/")) {
      await callApi({ kind: "image", base64, mimeType: file.type });
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

  // Render an in-progress card with a progress bar and a calibrated phrase.
  if (busy) return <ParsingProgress elapsed={elapsed} />;

  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { value: "text", label: "Paste", icon: FileText },
          { value: "image", label: "Screenshot", icon: ImageIcon },
          { value: "pdf", label: "PDF", icon: FileType },
        ]}
      />

      {tab === "text" && (
        <div className="space-y-3">
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your MCAT plan here (text, CSV, weekly schedule, etc.)…"
            className="font-mono text-[12px]"
          />
          <Button
            disabled={!text.trim()}
            onClick={submitText}
            size="md"
          >
            <Sparkles size={14} />
            Parse with Claude
          </Button>
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
            className="w-full border-2 border-dashed border-border-strong hover:border-accent/60 rounded-xl py-14 px-6 text-center transition-colors bg-surface-2/40 hover:bg-surface-2"
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

      {error && (
        <div className="text-[12px] text-danger bg-[color:var(--danger-soft)] border border-danger/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-[12px] text-text-2 hover:text-text-1 transition-colors"
      >
        Skip for now → start with a blank calendar
      </button>
    </div>
  );
}

function formatMmSs(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function ParsingProgress({ elapsed }) {
  // Easing toward 95% so the bar never claims to be done; the final 5%
  // resolves when the API actually returns.
  const ratio = Math.min(0.95, 1 - Math.exp(-elapsed / PARSE_ETA_SECONDS));
  const pct = Math.round(ratio * 100);

  let phase = "Reading your plan…";
  if (elapsed > 20) phase = "Extracting blocks…";
  if (elapsed > 60) phase = "Mapping to categories…";
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
            Parsing with Claude
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
        Dense PDFs and screenshots can take up to{" "}
        <span className="text-text-2 tabular">6–7 minutes</span>. Keep this tab
        open — we'll show your plan as soon as it's ready.
      </div>
    </div>
  );
}
