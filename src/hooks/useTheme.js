import { useEffect, useState } from "react";

const KEY = "mcat:theme";

function read() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(KEY) || "dark";
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  // Sync the browser UI color so iOS/Android chrome matches.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#fafaf7" : "#0a0b0d");
}

/**
 * Lightweight theme hook — persists to localStorage and toggles
 * `data-theme="light"` on <html>. Defaults to dark.
 */
export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, setTheme, toggle };
}
