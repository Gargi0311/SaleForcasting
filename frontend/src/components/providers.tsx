"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useApi, type DatasetInfo, type FilterOptions, type ModelInfo } from "@/lib/api";

export interface FilterState {
  start: string;
  end: string;
  region: string[];
  category: string[];
  segment: string[];
}

export const EMPTY_FILTERS: FilterState = { start: "", end: "", region: [], category: [], segment: [] };

interface AppCtx {
  /** Bumped whenever the dataset or model changes so every view refetches. */
  version: number;
  bump: () => void;
  options: FilterOptions | null;
  optionsError: string | null;
  dataset: DatasetInfo | null;
  model: ModelInfo | null;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppStateProvider>");
  return ctx;
}

/** Dashboard-wide state: filters, dataset/model metadata and a refetch counter. */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const options = useApi<FilterOptions>("/filters", undefined, version);
  const dataset = useApi<DatasetInfo>("/dataset", undefined, version);
  const model = useApi<ModelInfo>("/model", undefined, version);

  const bump = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setVersion((v) => v + 1);
  }, []);

  return (
    <Ctx.Provider
      value={{ version, bump, options: options.data, optionsError: options.error, dataset: dataset.data, model: model.data, filters, setFilters }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Jump to the top on route changes (Lenis owns the scroll position). */
function ScrollReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
        <ScrollReset />
        {children}
      </ReactLenis>
    </ThemeProvider>
  );
}
