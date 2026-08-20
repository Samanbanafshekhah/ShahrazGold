import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "shg_theme";

function apply(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = (window.localStorage.getItem(KEY) as ThemeMode | null) ?? "light";
  apply(stored);
}

export function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => {
    const stored = (window.localStorage.getItem(KEY) as ThemeMode | null) ?? "light";
    setMode(stored);
    apply(stored);
    if (stored === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);
  const set = (m: ThemeMode) => {
    window.localStorage.setItem(KEY, m);
    setMode(m);
    apply(m);
  };
  return [mode, set];
}

export function validateIranianMobile(v: string): boolean {
  return /^09\d{9}$/.test(v.trim());
}