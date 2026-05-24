"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "system", Icon: Monitor },
  { value: "light", label: "light", Icon: Sun },
  { value: "dark", label: "dark", Icon: Moon },
];

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

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
            onClick={() => setTheme(value)}
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
