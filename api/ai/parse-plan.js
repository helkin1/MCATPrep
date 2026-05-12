import Anthropic from "@anthropic-ai/sdk";
import { PARSE_PLAN_SYSTEM_PROMPT, DESCRIBE_PLAN_SYSTEM_PROMPT } from "./prompts.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-IP rate limiting (in-memory; resets on cold start — fine for prototype)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

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

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

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
    const body = req.body || {};
    const { kind, text, base64, mimeType, instructions, examDate, startDate } = body;
    if (!kind) return res.status(400).json({ error: "Missing 'kind'" });

    // Pick the right system prompt. "describe" generates a plan from intent;
    // the rest extract from a source document.
    const system =
      kind === "describe" ? DESCRIBE_PLAN_SYSTEM_PROMPT : PARSE_PLAN_SYSTEM_PROMPT;

    // Optional preamble attached to every request. Lets the user add free-form
    // instructions ("CARS in the mornings", "skip Sundays") that override
    // ambiguities in the parsed/described plan.
    const preamble = [];
    if (kind === "describe") {
      if (startDate) preamble.push(`Start date: ${startDate}`);
      if (examDate) preamble.push(`Exam date: ${examDate}`);
    }
    if (instructions && typeof instructions === "string" && instructions.trim()) {
      preamble.push(`User instructions:\n${instructions.trim()}`);
    }
    const preambleText = preamble.length ? preamble.join("\n\n") + "\n\n" : "";

    // Build the user content
    let content;
    if (kind === "text") {
      if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });
      if (text.length > 200_000) return res.status(413).json({ error: "Text too long" });
      content = [{ type: "text", text: preambleText + text }];
    } else if (kind === "describe") {
      if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing description" });
      if (text.length > 50_000) return res.status(413).json({ error: "Description too long" });
      content = [{ type: "text", text: preambleText + "User description:\n" + text }];
    } else if (kind === "image") {
      if (!base64 || !mimeType) return res.status(400).json({ error: "Missing image data" });
      if (base64.length > MAX_BYTES * 1.4) return res.status(413).json({ error: "Image too large" });
      content = [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
        { type: "text", text: preambleText + "Parse this MCAT study plan screenshot." },
      ];
    } else if (kind === "pdf") {
      if (!base64) return res.status(400).json({ error: "Missing pdf data" });
      if (base64.length > MAX_BYTES * 1.4) return res.status(413).json({ error: "PDF too large" });
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: preambleText + "Parse this MCAT study plan PDF." },
      ];
    } else {
      return res.status(400).json({ error: "Invalid 'kind'. Use 'text', 'image', 'pdf', or 'describe'." });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content }],
    });

    // Pull the first text block from the response
    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Strip code fences if Claude wrapped them despite instructions
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

    return res.status(200).json({ ok: true, parsed, usage: message.usage });
  } catch (err) {
    console.error("[parse-plan]", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
  },
};
