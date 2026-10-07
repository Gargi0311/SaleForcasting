"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fmt } from "@/lib/format";
import { CommandPalette, NAV_ITEMS } from "./command-palette";
import { Icon } from "./icons";
import { useApp } from "./providers";
import { ThemeToggle } from "./theme-toggle";

const COLLAPSE_KEY = "salescast.sidebar.collapsed";

function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function timeAgo(iso?: string) {
  if (!iso) return "–";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = normalize(usePathname());
  const router = useRouter();
  const { dataset, model, optionsError } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });

  useEffect(() => setDrawer(false), [pathname]);

  // ⌘K / Ctrl+K opens the palette; "g" then a letter jumps between pages.
  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout>;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "[") return toggleCollapsed();
      if (pendingG) {
        pendingG = false;
        const item = NAV_ITEMS.find((n) => n.keys.endsWith(e.key.toUpperCase()));
        if (item) router.push(item.href);
      } else if (e.key === "g") {
        pendingG = true;
        clearTimeout(timer);
        timer = setTimeout(() => (pendingG = false), 900);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [router]);

  const current = NAV_ITEMS.find((n) => n.href === pathname);
  const groups = [...new Set(NAV_ITEMS.map((n) => n.group))];
  const online = !optionsError && Boolean(dataset);

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <aside className={`sidebar ${drawer ? "open" : ""}`} aria-label="Sidebar">
        <Link href="/" className="workspace" title="SalesCast home">
          <span className="ws-logo">
            <Icon name="logo" size={17} strokeWidth={2.4} />
          </span>
          <span className="ws-text">
            <strong>SalesCast</strong>
            <span>{dataset ? `${dataset.kind === "upload" ? dataset.filename : "Superstore"} · Production` : "Connecting…"}</span>
          </span>
        </Link>

        <button className="cmd-trigger" onClick={() => setPalette(true)} title="Search (Ctrl K)">
          <Icon name="search" size={15} />
          <span>Search…</span>
          <span className="kbds">
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </span>
        </button>

        <nav className="nav" aria-label="Main">
          {groups.map((g) => (
            <div key={g} className="nav-group">
              <span className="nav-group-label">{g}</span>
              {NAV_ITEMS.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.href;
                return (
                  <Link key={n.href} href={n.href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? n.label : undefined}>
                    <Icon name={n.icon} size={17} />
                    <span>{n.label}</span>
                    {n.href === "/dashboard/forecast" && <span className="nav-badge">ML</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="status-card">
            <div className="status-row">
              <span className={`status-dot ${optionsError ? "down" : online ? "up" : ""}`} />
              API
              <strong>{optionsError ? "Offline" : online ? "Operational" : "…"}</strong>
            </div>
            <div className="status-row">
              <Icon name="cpu" size={13} />
              Model
              <strong>{model ? `R² ${model.metrics.test_r2.toFixed(2)}` : "–"}</strong>
            </div>
            <div className="status-row">
              <Icon name="data" size={13} />
              Rows
              <strong>{dataset ? fmt.int(dataset.rows) : "–"}</strong>
            </div>
          </div>
          <div className="foot-actions">
            <button className="icon-btn plain collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={`${collapsed ? "Expand" : "Collapse"} sidebar  [`}>
              <Icon name={collapsed ? "expand" : "collapse"} size={17} />
            </button>
            <Link className="icon-btn plain" href="/" aria-label="Back to landing page" title="Back to landing page">
              <Icon name="home" size={17} />
            </Link>
          </div>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open navigation" onClick={() => setDrawer(true)}>
            <Icon name="menu" size={18} />
          </button>
          <div className="crumbs">
            <span className="crumb-root">Dashboard</span>
            <span className="crumb-sep">/</span>
            <strong>{current?.label ?? ""}</strong>
          </div>
          <div className="topbar-actions">
            <span className="env-pill">
              <span className={`status-dot ${online ? "up" : optionsError ? "down" : ""}`} />
              {optionsError ? "Disconnected" : "Live"}
            </span>
            <button className="icon-btn" onClick={() => setPalette(true)} aria-label="Open command palette" title="Command palette (Ctrl K)">
              <Icon name="search" size={16} />
            </button>
            <a className="icon-btn" href="/docs" target="_blank" rel="noreferrer" aria-label="API reference" title="API reference">
              <Icon name="external" size={16} />
            </a>
            <ThemeToggle />
          </div>
        </header>

        <main className="content">
          {optionsError && (
            <div className="callout danger" role="alert">
              <strong>Can&apos;t reach the API.</strong> Start the backend with <code>uvicorn app.main:app --reload</code> in <code>backend/</code>.
            </div>
          )}
          {children}
        </main>

        <footer className="statusbar">
          <span>
            <span className={`status-dot ${online ? "up" : optionsError ? "down" : ""}`} />
            {optionsError ? "api: offline" : "api: connected"}
          </span>
          <span className="hide-sm">model: ridge+gbr · trained {timeAgo(model?.trained_at)}</span>
          <span className="hide-sm">dataset: {dataset ? `${dataset.fingerprint} · ${dataset.min_date} → ${dataset.max_date}` : "–"}</span>
          <span className="right">v2.0.0</span>
        </footer>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
