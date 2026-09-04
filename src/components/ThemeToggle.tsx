"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "mynews:theme";
const listeners = new Set<() => void>();

// The DOM class (set synchronously by the theme init script in layout.tsx before hydration)
// is the source of truth; useSyncExternalStore lets React read it without an effect+setState
// round trip, while still rendering the SSR-safe `false` snapshot for the first client pass.
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function setDark(next: boolean): void {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {}
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!isDark)}
      aria-label="다크모드 전환"
      className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    >
      {isDark ? "☀️ 라이트" : "🌙 다크"}
    </button>
  );
}
