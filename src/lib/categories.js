/**
 * Category definitions. Built-in categories ship with the app; users can
 * customize colors and add/remove their own. Custom categories are stored
 * in `profiles.settings.categories` as an array merged with these defaults.
 */

// `priority` controls the order blocks surface in dense views like the
// month grid (lower number = more prominent). User can reorder these via
// Settings → Categories; the reordered list is stored back as the user's
// settings.categories (full list, not just overrides).
export const DEFAULT_CATEGORIES = [
  { id: "test", label: "Practice test", color: "#ef4444", studyish: true, priority: 1, builtin: true },
  { id: "questions", label: "Practice questions", color: "#f43f5e", studyish: true, priority: 2, builtin: true },
  { id: "bb", label: "Bio / Biochem", color: "#22c55e", studyish: true, priority: 3, builtin: true },
  { id: "cp", label: "Chem / Physics", color: "#3b82f6", studyish: true, priority: 4, builtin: true },
  { id: "ps", label: "Psych / Soc", color: "#ec4899", studyish: true, priority: 5, builtin: true },
  { id: "cars", label: "CARS", color: "#f59e0b", studyish: true, priority: 6, builtin: true },
  { id: "review", label: "Review / Anki", color: "#a855f7", studyish: true, priority: 7, builtin: true },
  { id: "personal", label: "Personal", color: "#06b6d4", studyish: false, priority: 8, builtin: true },
  { id: "exercise", label: "Exercise", color: "#14b8a6", studyish: false, priority: 9, builtin: true },
  { id: "meal", label: "Meal", color: "#eab308", studyish: false, priority: 10, builtin: true },
  { id: "break", label: "Break", color: "#64748b", studyish: false, priority: 11, builtin: true },
  { id: "sleep", label: "Sleep", color: "#475569", studyish: false, priority: 12, builtin: true },
];

export const DEFAULT_PRIORITY = 100;

/** Wide palette for custom category color picker. */
export const COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#475569", "#1f2937",
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
  "#16a34a", "#059669", "#0d9488", "#0891b2", "#0284c7",
  "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3",
  "#db2777", "#e11d48", "#94a3b8", "#334155", "#000000",
];

/**
 * Merge user-defined categories with defaults. User entries are honored in
 * their stored order (so reordering in Settings is sticky); defaults that
 * the user hasn't touched fall in after the user list in their natural
 * order. User overrides win on `id` collision.
 */
export function resolveCategories(custom = []) {
  const out = [];
  const seen = new Set();

  // First pass — preserve user-defined ordering, merge with builtin defaults.
  for (const c of custom || []) {
    const def = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
    out.push({ ...def, ...c });
    seen.add(c.id);
  }

  // Second pass — append untouched defaults in their original order.
  for (const d of DEFAULT_CATEGORIES) {
    if (!seen.has(d.id)) out.push(d);
  }

  // Reassign priority by current position so downstream sort is consistent
  // regardless of how priorities were originally stored.
  return out.map((c, i) => ({ ...c, priority: i + 1 }));
}

export function getCategory(categories, id) {
  return categories.find((c) => c.id === id) || categories[0];
}

/** Simple WCAG-ish contrast check to pick black/white text on a background hex. */
export function textOn(hex) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#fff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Perceived luminance
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? "#0a0a0a" : "#ffffff";
}
