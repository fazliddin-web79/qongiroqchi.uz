"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CircleDollarSign, Clock3, Megaphone, PhoneCall, Target, Users } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiRequest } from "@/lib/api/client";

type PlatformData = {
  totals: Record<string, number>;
  approvals: { campaigns: number; audio: number };
  queue: { status: string; workers: number; counts: Record<string, number> | null };
};

export function PlatformDashboardOverview() {
  const { t } = useTranslations();
  const [data, setData] = useState<PlatformData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<PlatformData>("/api/dashboard/platform").then(setData).catch((value) => setError(value instanceof Error ? value.message : t("modules.common.error"))); }, [t]);
  if (error) return <ModuleError title={error} retry={() => location.reload()} retryLabel={t("modules.common.retry")} />;
  if (!data) return <ModuleLoading label={t("modules.common.loading")} />;
  const cards = [
    ["totalCompanies", Building2], ["activeCompanies", Building2], ["suspendedCompanies", AlertTriangle], ["totalCampaigns", Megaphone],
    ["runningCampaigns", Clock3], ["totalCalls", PhoneCall], ["totalLeads", Target], ["monthlyRevenue", CircleDollarSign],
    ["activeSubscriptions", Users], ["pendingApprovals", Clock3], ["systemErrors", AlertTriangle],
  ] as const;
  return <><PageHeader title={t("platformDashboard.title")} description={t("platformDashboard.description")} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key, Icon]) => <StatCard key={key} icon={Icon} label={t(`platformDashboard.${key}`)} value={String(data.totals[key] ?? 0)} change={key === "monthlyRevenue" ? "UZS" : ""} />)}</div><Card className="mt-6"><CardHeader><CardTitle>{t("platformDashboard.queueStatus")}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><p>{data.queue.status}</p><p>{t("platformDashboard.workers")}: {data.queue.workers}</p><p>{t("platformDashboard.pendingAudio")}: {data.approvals.audio}</p></CardContent></Card></>;
}
