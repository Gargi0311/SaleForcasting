"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icon } from "./icons";

const OPTIONS = [
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "system", label: "System", icon: "monitor" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button key={o.value} role="radio" aria-checked={active} aria-label={o.label} title={o.label} className={active ? "active" : ""} onClick={() => setTheme(o.value)}>
            <Icon name={o.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
