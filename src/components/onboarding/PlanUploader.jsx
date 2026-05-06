import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, FileType, Loader2 } from "lucide-react";

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      // Strip "data:.../...;base64," prefix
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

  const TabBtn = ({ id, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        tab === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-zinc-800 pb-2">
        <TabBtn id="text" icon={FileText} label="Paste text / spreadsheet" />
        <TabBtn id="image" icon={ImageIcon} label="Screenshot" />
        <TabBtn id="pdf" icon={FileType} label="PDF" />
      </div>

      {tab === "text" && (
        <div className="space-y-2">
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your MCAT plan here (text, CSV, weekly schedule, etc.)…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-sm focus:border-blue-500 outline-none font-mono"
          />
          <button
            disabled={busy || !text.trim()}
            onClick={submitText}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md text-sm flex items-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Parse with Claude
          </button>
        </div>
      )}

      {(tab === "image" || tab === "pdf") && (
        <div className="space-y-2">
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
            className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg py-12 text-center transition-colors"
          >
            {busy ? (
              <div className="flex items-center justify-center gap-2 text-zinc-300">
                <Loader2 size={16} className="animate-spin" /> Parsing…
              </div>
            ) : (
              <>
                <div className="text-zinc-300 font-medium">
                  Click to upload {tab === "image" ? "screenshot" : "PDF"}
                </div>
                <div className="text-zinc-500 text-xs mt-1">
                  {tab === "image" ? "PNG, JPG, etc." : "PDF up to 8MB"}
                </div>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-900/60 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button onClick={onSkip} className="text-sm text-zinc-400 hover:text-zinc-100">
        Skip for now → start with a blank calendar
      </button>
    </div>
  );
}
