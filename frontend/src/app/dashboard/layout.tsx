import type { Metadata } from "next";
import { AppStateProvider } from "@/components/providers";
import { Shell } from "@/components/shell";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <Shell>{children}</Shell>
    </AppStateProvider>
  );
}
