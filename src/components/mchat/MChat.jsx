import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  Edit3,
  Trash2 as RejectIcon,
} from "lucide-react";
import { Button, Textarea, Input, Select } from "@/components/ui";
import { resolveCategories } from "@/lib/categories";
import { dayKey, addDays, daysBetween, todayKey } from "@/lib/time";
import { executeAction, summarizeAction } from "@/lib/mchat-actions";
import { cn } from "@/lib/utils";

/**
 * MChatProvider wires app-level state + mutators into a context the chat
 * panel can use. We don't pass the days blob into the API on every keystroke
 * — only on send — to keep state changes cheap.
 */
const MChatCtx = createContext(null);

export function MChatProvider({
  profile,
  updateProfile,
  days,
  templates,
  upsertBlock,
  deleteBlock,
  moveBlock,
  setDayTodos,
  children,
}) {
  const mutators = useMemo(
    () => ({
      profile,
      updateProfile,
      days,
      templates,
      upsertBlock,
      deleteBlock,
      moveBlock,
      setDayTodos,
    }),
    [profile, updateProfile, days, templates, upsertBlock, deleteBlock, moveBlock, setDayTodos]
  );

  const [open, setOpen] = useState(false);
  return (
    <MChatCtx.Provider value={{ mutators, open, setOpen }}>
      {children}
      <MChat open={open} onClose={() => setOpen(false)} />
      {!open && <MChatFab onClick={() => setOpen(true)} />}
    </MChatCtx.Provider>
  );
}

export function useMChat() {
  const ctx = useContext(MChatCtx);
  if (!ctx) throw new Error("useMChat must be used inside <MChatProvider>");
  return ctx;
}

// ── Floating action button ──────────────────────────────────────────────

function MChatFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open M-Chat"
      className="group fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-accent to-accent-strong text-text-inverse flex items-center justify-center transition-[transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:scale-105 hover:shadow-xl active:scale-95"
    >
      <Sparkles size={18} className="drop-shadow-sm" />
      <span className="absolute inset-0 rounded-full ring-2 ring-accent/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Side panel ──────────────────────────────────────────────────────────

const STORAGE_KEY = (userId) => `mcat:mchat:${userId || "anon"}:messages`;

function MChat({ open, onClose }) {
  const { mutators } = useMChat();
  const { profile } = mutators;
  const userId = profile?.id;

  // Persist message history per user so M-Chat remembers conversation across
  // sessions. Memory of facts lives separately in profile.settings.memory.
  const [messages, setMessages] = useState(() => loadMessages(userId));
  useEffect(() => setMessages(loadMessages(userId)), [userId]);
  useEffect(() => saveMessages(userId, messages), [userId, messages]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = useCallback(
    async (text) => {
      const content = (text ?? draft).trim();
      if (!content || sending) return;
      setError(null);
      setDraft("");

      const userTurn = { role: "user", content: [{ type: "text", text: content }] };
      const newMessages = [...messages, userTurn];
      setMessages(newMessages);
      setSending(true);

      try {
        const ctx = buildContext(mutators);
        const memory = mutators.profile?.settings?.memory || "";

        const res = await fetch("/api/ai/m-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            context: ctx,
            memory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");

        const assistantTurn = {
          role: "assistant",
          content: data.content,
          stop_reason: data.stop_reason,
        };
        setMessages((m) => [...m, assistantTurn]);
      } catch (e) {
        setError(e.message);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: [{ type: "text", text: `Error: ${e.message}` }], error: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [draft, sending, messages, mutators]
  );

  // Apply an approved batch of proposed actions. We record an outcome line
  // (one per tool call) so the user sees what landed. The model is not
  // sent a tool_result follow-up — the next user turn picks up from here.
  const applyBatch = useCallback(
    async (turnIdx, edits) => {
      const turn = messages[turnIdx];
      const toolUses = turn.content.filter((b) => b.type === "tool_use");

      const outcomes = [];
      for (const t of toolUses) {
        const overrides = edits?.[t.id] || {};
        const call = { name: t.name, input: { ...t.input, ...overrides } };
        try {
          const out = await executeAction(call, mutators);
          outcomes.push({ ok: true, msg: out });
        } catch (e) {
          outcomes.push({ ok: false, msg: e.message || "Failed" });
        }
      }

      // Mark the turn as resolved and append a system note describing the
      // outcome. Stored on the turn so re-renders show "Applied" state.
      setMessages((m) =>
        m.map((msg, i) =>
          i === turnIdx ? { ...msg, _resolution: { approved: true, outcomes } } : msg
        )
      );
    },
    [messages, mutators]
  );

  const rejectBatch = useCallback((turnIdx) => {
    setMessages((m) =>
      m.map((msg, i) => (i === turnIdx ? { ...msg, _resolution: { approved: false } } : msg))
    );
  }, []);

  const clearHistory = () => {
    if (!confirm("Clear this conversation? Persistent memory will be kept.")) return;
    setMessages([]);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-[var(--dur-base)]",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-surface-1 border-l border-border shadow-xl flex flex-col",
          "transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="M-Chat"
      >
        <header className="flex items-center gap-2.5 px-4 h-12 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-strong shadow-sm flex items-center justify-center">
            <Sparkles size={12} className="text-text-inverse" />
          </div>
          <div className="font-display text-[14px] font-semibold tracking-tight text-text-1">
            M-Chat
          </div>
          <span className="text-[11px] text-text-3">Proposes changes — you approve</span>
          <button
            onClick={clearHistory}
            className="ml-auto text-[11px] text-text-3 hover:text-text-1 transition-colors"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.length === 0 && <Welcome onPick={(t) => send(t)} mutators={mutators} />}
          {messages.map((m, i) => (
            <ChatTurn
              key={i}
              message={m}
              turnIdx={i}
              onApply={applyBatch}
              onReject={rejectBatch}
              categories={resolveCategories(mutators.profile?.settings?.categories)}
            />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-[12px] text-text-2 px-2 py-1">
              <Loader2 size={12} className="animate-spin" /> Thinking…
            </div>
          )}
          {error && (
            <div className="text-[12px] text-danger bg-[color:var(--danger-soft)] border border-danger/30 rounded-md px-2.5 py-1.5 mx-1">
              {error}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-2.5 border-t border-border flex items-end gap-2">
          <Textarea
            ref={inputRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask M-Chat anything about your plan…"
            className="!min-h-[44px] resize-none text-[13px]"
            disabled={sending}
          />
          <Button
            size="sm"
            onClick={() => send()}
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="px-2.5"
          >
            <Send size={14} />
          </Button>
        </div>
      </aside>
    </>
  );
}

// ── Welcome state ──────────────────────────────────────────────────────

function Welcome({ onPick, mutators }) {
  const days = mutators.profile?.exam_date
    ? daysBetween(todayKey(), mutators.profile.exam_date)
    : null;
  const suggestions = [
    "Review my plan for next week",
    "Add a CARS block daily at 7am",
    "What should I focus on this week?",
    "Move all my full-lengths to Saturdays",
  ];
  return (
    <div className="px-2 pt-3 space-y-4">
      <div>
        <div className="font-display text-[18px] font-semibold tracking-tight text-text-1">
          What can M-Chat help with?
        </div>
        <p className="text-[12px] text-text-2 mt-1 leading-relaxed">
          I can see your schedule, todos, categories, and templates. I'll
          propose changes — you decide what to apply.
          {days !== null && (
            <>
              {" "}
              <span className="text-text-3">
                ({days > 0 ? `${days} days to MCAT.` : "Exam day reached."})
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-[12px] text-text-2 hover:text-text-1 bg-surface-2 hover:bg-surface-3 border border-border rounded-full px-2.5 py-1 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat turn ──────────────────────────────────────────────────────────

function ChatTurn({ message, turnIdx, onApply, onReject, categories }) {
  if (message.role === "user") {
    const text = textOf(message.content);
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] bg-accent-strong text-text-inverse rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  // Assistant turn — may contain text + tool_use blocks.
  const textBlocks = (message.content || []).filter((b) => b.type === "text");
  const toolUses = (message.content || []).filter((b) => b.type === "tool_use");

  return (
    <div className="flex flex-col gap-2 items-start">
      {textBlocks.map((b, i) => (
        <div
          key={i}
          className={cn(
            "max-w-[92%] rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed whitespace-pre-wrap border",
            message.error
              ? "bg-[color:var(--danger-soft)] text-danger border-danger/30"
              : "bg-surface-2 text-text-1 border-border"
          )}
        >
          {b.text}
        </div>
      ))}

      {toolUses.length > 0 && (
        <ProposedChanges
          toolUses={toolUses}
          resolution={message._resolution}
          onApply={(edits) => onApply(turnIdx, edits)}
          onReject={() => onReject(turnIdx)}
          categories={categories}
        />
      )}
    </div>
  );
}

function textOf(content) {
  if (typeof content === "string") return content;
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ── Proposed changes card with Approve / Edit / Reject ─────────────────

function ProposedChanges({ toolUses, resolution, onApply, onReject, categories }) {
  // Local edit state — keyed by tool_use id, holds field overrides.
  const [edits, setEdits] = useState({});
  const [expanded, setExpanded] = useState({});

  const setEdit = (id, patch) =>
    setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), ...patch } }));

  if (resolution?.approved) {
    return (
      <div className="w-full bg-success-soft border border-success/30 rounded-lg px-3 py-2 text-[12px] text-success">
        <div className="font-medium mb-1">Applied:</div>
        <ul className="space-y-0.5">
          {(resolution.outcomes || []).map((o, i) => (
            <li key={i} className={cn("flex items-start gap-1.5", !o.ok && "text-danger")}>
              <Check size={11} className="mt-0.5 flex-shrink-0" />
              <span>{o.msg}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (resolution && !resolution.approved) {
    return (
      <div className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-text-3">
        Rejected — no changes applied.
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-2 border border-border-strong rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-surface-3/50">
        <div className="text-[11px] uppercase tracking-[0.06em] text-text-3 font-medium">
          Proposed changes
        </div>
        <div className="text-[12px] text-text-1 mt-0.5">
          {toolUses.length} change{toolUses.length === 1 ? "" : "s"} ready to apply
        </div>
      </div>

      <div className="divide-y divide-border">
        {toolUses.map((t) => {
          const isExpanded = !!expanded[t.id];
          const editObj = edits[t.id] || {};
          const merged = { ...t.input, ...editObj };
          return (
            <div key={t.id} className="px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-text-1 leading-snug">
                    {summarizeAction({ name: t.name, input: merged })}
                  </div>
                  {!isExpanded && (
                    <div className="text-[11px] text-text-3 mt-0.5 font-mono tabular truncate">
                      {Object.entries(merged)
                        .filter(([k]) => k !== "notes")
                        .map(([k, v]) => `${k}=${v}`)
                        .join("  ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}
                  className="text-text-3 hover:text-text-1 transition-colors flex-shrink-0"
                  aria-label="Edit"
                >
                  <Edit3 size={12} />
                </button>
              </div>

              {isExpanded && (
                <EditFields
                  name={t.name}
                  values={merged}
                  onChange={(patch) => setEdit(t.id, patch)}
                  categories={categories}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border flex items-center justify-end gap-2 bg-surface-1/40">
        <Button variant="ghost" size="sm" onClick={onReject}>
          <RejectIcon size={13} /> Reject
        </Button>
        <Button size="sm" onClick={() => onApply(edits)}>
          <Check size={13} /> Approve all
        </Button>
      </div>
    </div>
  );
}

function EditFields({ name, values, onChange, categories }) {
  // Field set per tool — we only expose the fields a user might want to tweak
  // on the fly. For exotic actions (set_memory, apply_template) we show the
  // raw value as readonly JSON so the user has at least visibility.
  if (
    name === "create_block" ||
    name === "update_block"
  ) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <Field label="Date">
          <Input size="sm" type="date" value={values.date || ""} onChange={(e) => onChange({ date: e.target.value })} />
        </Field>
        <Field label="Category">
          <Select size="sm" value={values.category || ""} onChange={(e) => onChange({ category: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start">
          <Input size="sm" type="time" value={values.start || ""} onChange={(e) => onChange({ start: e.target.value })} />
        </Field>
        <Field label="End">
          <Input size="sm" type="time" value={values.end || ""} onChange={(e) => onChange({ end: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <Field label="Title">
            <Input size="sm" value={values.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  if (name === "add_todo") {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <Field label="Date">
          <Input size="sm" type="date" value={values.date || ""} onChange={(e) => onChange({ date: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <Field label="Text">
            <Input size="sm" value={values.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  if (name === "set_memory") {
    return (
      <div className="mt-2">
        <Textarea
          rows={6}
          value={values.memory || ""}
          onChange={(e) => onChange({ memory: e.target.value })}
          className="text-[12px] font-mono"
        />
      </div>
    );
  }

  if (name === "update_exam_date") {
    return (
      <div className="mt-2">
        <Field label="Exam date">
          <Input size="sm" type="date" value={values.examDate || ""} onChange={(e) => onChange({ examDate: e.target.value })} />
        </Field>
      </div>
    );
  }

  // Fallback — readonly JSON view.
  return (
    <pre className="mt-2 text-[11px] font-mono text-text-2 bg-surface-1 border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(values, null, 2)}
    </pre>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.06em] text-text-3 font-medium mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── Storage helpers ─────────────────────────────────────────────────────

function loadMessages(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveMessages(userId, messages) {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(messages.slice(-60)));
  } catch {}
}

// ── Context builder ─────────────────────────────────────────────────────

function buildContext(mutators) {
  const { profile, days, templates } = mutators;
  const today = todayKey();
  const examDate = profile?.exam_date || null;
  const daysToExam = examDate ? daysBetween(today, examDate) : null;

  // Slice the schedule to the next 28 days so the context stays reasonable.
  const schedule = {};
  for (let i = 0; i < 28; i++) {
    const k = dayKey(addDays(new Date(), i));
    if (days[k]) schedule[k] = days[k];
  }

  const categories = resolveCategories(profile?.settings?.categories);

  const tplList = [];
  for (const t of templates?.daily || []) {
    tplList.push({ id: t.id, kind: "daily", name: t.name, size: `${t.blocks.length} blocks` });
  }
  for (const t of templates?.weekly || []) {
    tplList.push({ id: t.id, kind: "weekly", name: t.name, size: `${t.days.length} day(s)` });
  }

  return {
    today,
    examDate,
    daysToExam,
    categories,
    schedule,
    templates: tplList,
  };
}

