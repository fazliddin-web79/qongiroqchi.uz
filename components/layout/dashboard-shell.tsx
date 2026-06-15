"use client";

import { useState, type ReactNode } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen"><DashboardSidebar open={open} onClose={() => setOpen(false)} /><div className="lg:pl-64"><DashboardTopbar onMenu={() => setOpen(true)} /><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
