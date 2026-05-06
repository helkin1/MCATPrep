/**
 * Time and date helpers. All "day keys" are local-time YYYY-MM-DD strings.
 * All "time of day" values are HH:MM strings (24-hour).
 */

export function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfWeek(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayOfWeekIndex(d) {
  return d.getDay(); // 0=Sun
}

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min) {
  min = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatHour(h) {
  if (h === 0 || h === 24) return "12 am";
  if (h === 12) return "12 pm";
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

export function formatTimeRange(start, end) {
  return `${formatTimeShort(start)} – ${formatTimeShort(end)}`;
}

export function formatTimeShort(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hh} ${ampm}` : `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDuration(min) {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60),
    m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function todayKey() {
  return dayKey(new Date());
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Given two ISO date strings (YYYY-MM-DD), return the integer day delta. */
export function daysBetween(a, b) {
  const da = parseDayKey(a);
  const db = parseDayKey(b);
  return Math.round((db - da) / 86400000);
}
