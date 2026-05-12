import Anthropic from "@anthropic-ai/sdk";
import { REFINE_PLAN_SYSTEM_PROMPT } from "./prompts.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-IP rate limiting (in-memory; resets on cold start — fine for prototype)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30; // refine is small + chatty, allow more than parse

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

const MAX_HISTORY = 12;

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
    const { items, message, history, examDate, startDate } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: "Missing items[]" });
    if (!message || typeof message !== "string") return res.status(400).json({ error: "Missing message" });
    if (items.length > 2000) return res.status(413).json({ error: "Too many items" });

    // Build the conversation. The current item list is always pinned in the
    // newest user turn so the model never has to remember from prior turns.
    const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
    const turns = [];
    for (const h of trimmedHistory) {
      if (h.role !== "user" && h.role !== "assistant") continue;
      if (typeof h.content !== "string") continue;
      turns.push({ role: h.role, content: h.content });
    }

    const meta = [];
    if (startDate) meta.push(`Start date: ${startDate}`);
    if (examDate) meta.push(`Exam date: ${examDate}`);
    const metaText = meta.length ? meta.join("\n") + "\n\n" : "";

    turns.push({
      role: "user",
      content: `${metaText}Current plan (${items.length} items):\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\`\n\nUser message: ${message}`,
    });

    const completion = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: REFINE_PLAN_SYSTEM_PROMPT,
      messages: turns,
    });

    const raw = completion.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({
        error: "Model did not return valid JSON",
        raw: cleaned.slice(0, 1500),
      });
    }

    if (!Array.isArray(parsed.items)) {
      return res.status(502).json({ error: "Model response missing items[]", raw: cleaned.slice(0, 1500) });
    }

    return res.status(200).json({
      ok: true,
      items: parsed.items,
      reply: parsed.reply || "Done.",
      warnings: parsed.warnings || [],
      usage: completion.usage,
    });
  } catch (err) {
    console.error("[refine-plan]", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" },
  },
};
