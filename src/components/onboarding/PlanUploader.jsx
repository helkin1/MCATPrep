import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, FileType, Loader2, Upload } from "lucide-react";
import { Button, Segmented, Textarea } from "@/components/ui";

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
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

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
            disabled={busy || !text.trim()}
            onClick={submitText}
            size="md"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
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
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border-strong hover:border-accent/60 rounded-xl py-14 px-6 text-center transition-colors bg-surface-2/40 hover:bg-surface-2"
          >
            {busy ? (
              <div className="flex items-center justify-center gap-2 text-text-1 text-[13px]">
                <Loader2 size={16} className="animate-spin" /> Parsing with Claude…
              </div>
            ) : (
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
            )}
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
