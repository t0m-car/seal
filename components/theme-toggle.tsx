"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const THEME_KEY = "seal.theme";

type Theme = "system" | "light" | "dark";

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "system", Icon: Monitor },
  { value: "light", label: "light", Icon: Sun },
  { value: "dark", label: "dark", Icon: Moon },
];

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored =
      (typeof localStorage !== "undefined"
        ? (localStorage.getItem(THEME_KEY) as Theme | null)
        : null) ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read
    setThemeState(stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current =
        (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function set(next: Theme) {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="border-border bg-surface inline-flex items-center gap-0.5 rounded-md border p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Theme: ${label}`}
            onClick={() => set(value)}
            className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] transition-colors ${
              active
                ? "bg-accent-soft text-primary"
                : "text-fg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
