import Anthropic from "@anthropic-ai/sdk";
import { MCHAT_SYSTEM_PROMPT, MCHAT_TOOLS } from "./prompts.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 40;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const MAX_HISTORY_TURNS = 30;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || "anon";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Please wait a minute." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const { messages, context, memory } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages[]" });
    }
    if (messages.length > MAX_HISTORY_TURNS * 2) {
      // Drop older turns rather than fail — keep the most recent.
      messages.splice(0, messages.length - MAX_HISTORY_TURNS * 2);
    }

    // Build a context block injected as the leading system content. Kept
    // out of the system prompt string so it can refresh per-request without
    // bloating the cached system message.
    const contextBlock = buildContext(context, memory);
    const system = [
      { type: "text", text: MCHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextBlock },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system,
      messages,
      tools: MCHAT_TOOLS,
    });

    return res.status(200).json({
      ok: true,
      stop_reason: response.stop_reason,
      content: response.content,
      usage: response.usage,
    });
  } catch (err) {
    console.error("[m-chat]", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

function buildContext(ctx, memory) {
  if (!ctx) return "Context: (none provided)";
  const lines = [];
  lines.push("# Current context");
  lines.push("");
  if (ctx.today) lines.push(`Today: ${ctx.today}`);
  if (ctx.examDate) lines.push(`Exam date: ${ctx.examDate}`);
  if (typeof ctx.daysToExam === "number") lines.push(`Days to exam: ${ctx.daysToExam}`);
  if (ctx.route) lines.push(`Current route: ${ctx.route}`);
  if (ctx.viewingDate) lines.push(`Viewing day: ${ctx.viewingDate}`);
  if (Array.isArray(ctx.categories) && ctx.categories.length) {
    lines.push("");
    lines.push("Categories (priority order, top = highest):");
    for (const c of ctx.categories) {
      lines.push(`  - ${c.id}: ${c.label}${c.studyish ? " (study)" : ""}`);
    }
  }
  if (Array.isArray(ctx.templates) && ctx.templates.length) {
    lines.push("");
    lines.push("Templates available:");
    for (const t of ctx.templates) {
      lines.push(`  - [${t.kind}] ${t.id}: "${t.name}" (${t.size})`);
    }
  }
  if (ctx.schedule && typeof ctx.schedule === "object") {
    lines.push("");
    lines.push("Upcoming schedule (next 28 days):");
    const keys = Object.keys(ctx.schedule).sort();
    if (keys.length === 0) {
      lines.push("  (empty)");
    } else {
      for (const k of keys) {
        const day = ctx.schedule[k];
        const blocks = (day.blocks || []).map((b) =>
          `    - ${b.id} | ${b.start}–${b.end} | ${b.category} | ${b.title || ""}`
        );
        const todos = (day.todos || []).map((t) =>
          `    todo ${t.id}: ${t.done ? "[x]" : "[ ]"} ${t.text}`
        );
        if (blocks.length || todos.length) {
          lines.push(`  ${k}:`);
          if (blocks.length) lines.push(...blocks);
          if (todos.length) lines.push(...todos);
        }
      }
    }
  }
  lines.push("");
  lines.push("# Persistent user memory");
  lines.push(memory && memory.trim() ? memory.trim() : "(empty — propose set_memory to save important facts about the user)");
  return lines.join("\n");
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
  },
};
