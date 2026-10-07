"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Icon, type IconName } from "./icons";
import { useApp } from "./providers";

interface Command {
  id: string;
  group: "Navigate" | "Actions" | "Preferences";
  label: string;
  icon: IconName;
  hint?: string;
  run: () => void | Promise<void>;
}

export const NAV_ITEMS: { href: string; label: string; icon: IconName; group: string; keys: string }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", group: "Analytics", keys: "G O" },
  { href: "/dashboard/insights", label: "Insights", icon: "insights", group: "Analytics", keys: "G I" },
  { href: "/dashboard/forecast", label: "Forecast", icon: "forecast", group: "Planning", keys: "G F" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "inventory", group: "Planning", keys: "G V" },
  { href: "/dashboard/model", label: "Model performance", icon: "model", group: "Machine learning", keys: "G M" },
  { href: "/dashboard/data", label: "Data sources", icon: "data", group: "Machine learning", keys: "G D" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { bump } = useApp();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV_ITEMS.map((n) => ({ id: n.href, group: "Navigate" as const, label: n.label, icon: n.icon, hint: n.keys, run: () => router.push(n.href) })),
      { id: "home", group: "Navigate", label: "Back to landing page", icon: "home", run: () => router.push("/") },
      {
        id: "retrain",
        group: "Actions",
        label: "Retrain forecasting model",
        icon: "refresh",
        run: async () => {
          await api.post("/model/retrain");
          bump();
        },
      },
      { id: "upload", group: "Actions", label: "Upload a dataset", icon: "upload", run: () => router.push("/dashboard/data") },
      { id: "docs", group: "Actions", label: "Open API reference", icon: "external", run: () => void window.open("/docs", "_blank", "noopener") },
      { id: "dark", group: "Preferences", label: "Switch to dark theme", icon: "moon", run: () => setTheme("dark") },
      { id: "light", group: "Preferences", label: "Switch to light theme", icon: "sun", run: () => setTheme("light") },
      { id: "system", group: "Preferences", label: "Use system theme", icon: "monitor", run: () => setTheme("system") },
    ],
    [router, setTheme, bump],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const execute = async (c: Command) => {
    setBusy(c.id);
    try {
      await c.run();
    } finally {
      setBusy(null);
      onClose();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[index]) {
      e.preventDefault();
      void execute(results[index]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastGroup = "";
  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmdk-input">
          <Icon name="search" size={18} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command or search…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined} />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list" id="cmdk-list" role="listbox" data-lenis-prevent>
          {results.length === 0 && <div className="cmdk-empty">No results for “{query}”</div>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? <div className="cmdk-group">{c.group}</div> : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header}
                <button id={`cmd-${c.id}`} role="option" aria-selected={i === index} className={`cmdk-item ${i === index ? "active" : ""}`} onMouseMove={() => setIndex(i)} onClick={() => void execute(c)}>
                  <Icon name={c.icon} size={17} />
                  {c.label}
                  <span className="hint">{busy === c.id ? "Working…" : c.hint}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
