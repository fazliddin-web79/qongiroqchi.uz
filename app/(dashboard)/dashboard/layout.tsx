import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/lib/auth/service";

export default async function Layout({ children }: { children: ReactNode }) {
  await requireAuth();
  return <DashboardShell>{children}</DashboardShell>;
}
