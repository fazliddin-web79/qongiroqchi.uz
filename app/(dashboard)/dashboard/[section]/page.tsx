import { notFound } from "next/navigation";
import { DashboardPlaceholder, type DashboardPageKey } from "@/components/pages/dashboard-placeholder";

const pageMap: Record<string, DashboardPageKey> = {
  companies: "companies", users: "users", campaigns: "campaigns", contacts: "contacts", calls: "calls", leads: "leads",
  errors: "errors", "audit-logs": "auditLogs", settings: "settings", billing: "billing",
};

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pageMap[section];
  if (!page) notFound();
  return <DashboardPlaceholder page={page} />;
}
