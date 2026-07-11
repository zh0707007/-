"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "bazi-theme-mode-v2";

export function ThemeToggle({ variant = "default" }: { variant?: "default" | "nav" }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setThemeMode(stored);
      document.body.classList.toggle("theme-dark", stored === "dark");
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", themeMode === "dark");
    window.localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  const shellClass =
    variant === "nav"
      ? "inline-flex self-center rounded-none border-l border-white/10 bg-black/10 p-0 sm:self-auto"
      : "inline-flex self-center rounded-md border border-white/10 bg-black/20 p-1 sm:self-auto";

  return (
    <div className={shellClass}>
      {(["light", "dark"] as const).map((mode) => (
        <button
          aria-pressed={themeMode === mode}
          className={`h-10 px-4 text-sm transition ${
            themeMode === mode
              ? variant === "nav"
                ? "bg-gold text-black"
                : "bg-gold text-black"
              : variant === "nav"
                ? "text-white/65 hover:bg-black/20 hover:text-gold"
                : "text-white/65 hover:text-gold"
          }`}
          key={mode}
          onClick={() => setThemeMode(mode)}
          type="button"
        >
          {mode === "light" ? "白色" : "深色"}
        </button>
      ))}
    </div>
  );
}
