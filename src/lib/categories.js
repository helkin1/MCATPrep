/**
 * Category definitions. Built-in categories ship with the app; users can
 * customize colors and add/remove their own. Custom categories are stored
 * in `profiles.settings.categories` as an array merged with these defaults.
 */

export const DEFAULT_CATEGORIES = [
  { id: "cars", label: "CARS", color: "#f59e0b", studyish: true, builtin: true },
  { id: "bb", label: "Bio / Biochem", color: "#22c55e", studyish: true, builtin: true },
  { id: "cp", label: "Chem / Physics", color: "#3b82f6", studyish: true, builtin: true },
  { id: "ps", label: "Psych / Soc", color: "#ec4899", studyish: true, builtin: true },
  { id: "test", label: "Practice test", color: "#ef4444", studyish: true, builtin: true },
  { id: "review", label: "Review / Anki", color: "#a855f7", studyish: true, builtin: true },
  { id: "exercise", label: "Exercise", color: "#14b8a6", studyish: false, builtin: true },
  { id: "meal", label: "Meal", color: "#eab308", studyish: false, builtin: true },
  { id: "break", label: "Break", color: "#64748b", studyish: false, builtin: true },
  { id: "personal", label: "Personal", color: "#06b6d4", studyish: false, builtin: true },
  { id: "sleep", label: "Sleep", color: "#475569", studyish: false, builtin: true },
];

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

/** Merge user-defined categories with defaults. User overrides win on `id` collision. */
export function resolveCategories(custom = []) {
  const map = new Map();
  for (const c of DEFAULT_CATEGORIES) map.set(c.id, c);
  for (const c of custom || []) {
    const existing = map.get(c.id);
    map.set(c.id, { ...existing, ...c });
  }
  return Array.from(map.values());
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
