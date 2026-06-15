import { notFound } from "next/navigation";
import { CampaignsPage } from "@/components/pages/campaigns-page";
import { ContactsPage } from "@/components/pages/contacts-page";
import { CallsPage } from "@/components/pages/calls-page";
import { LeadsPage } from "@/components/pages/leads-page";
import { QueuePage } from "@/components/pages/queue-page";
import { SettingsPage } from "@/components/pages/settings-page";
import { BillingPage } from "@/components/pages/billing-page";
import { DashboardPlaceholder, type DashboardPageKey } from "@/components/pages/dashboard-placeholder";

const pageMap: Record<string, DashboardPageKey> = {
  companies: "companies", users: "users", campaigns: "campaigns", contacts: "contacts", calls: "calls", leads: "leads",
  errors: "errors", "audit-logs": "auditLogs", settings: "settings", billing: "billing",
};

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "contacts") return <ContactsPage />;
  if (section === "campaigns") return <CampaignsPage />;
  if (section === "calls") return <CallsPage />;
  if (section === "leads") return <LeadsPage />;
  if (section === "operator") return <LeadsPage operatorPanel />;
  if (section === "queue") return <QueuePage />;
  if (section === "settings") return <SettingsPage />;
  if (section === "billing") return <BillingPage />;
  const page = pageMap[section];
  if (!page) notFound();
  return <DashboardPlaceholder page={page} />;
}
