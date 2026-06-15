import { notFound } from "next/navigation";
import { CampaignsPage } from "@/components/pages/campaigns-page";
import { ContactsPage } from "@/components/pages/contacts-page";
import { DashboardPlaceholder, type DashboardPageKey } from "@/components/pages/dashboard-placeholder";

const pageMap: Record<string, DashboardPageKey> = {
  companies: "companies", users: "users", campaigns: "campaigns", contacts: "contacts", calls: "calls", leads: "leads",
  errors: "errors", "audit-logs": "auditLogs", settings: "settings", billing: "billing",
};

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "contacts") return <ContactsPage />;
  if (section === "campaigns") return <CampaignsPage />;
  const page = pageMap[section];
  if (!page) notFound();
  return <DashboardPlaceholder page={page} />;
}
