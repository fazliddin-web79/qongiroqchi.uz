"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, PhoneCall, Target, TrendingUp, XCircle } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { apiRequest } from "@/lib/api/client";

type DashboardData = {
  totals: { totalCalls: number; answeredCalls: number; failedCalls: number; leads: number; conversionRate: number };
  campaignStatistics: { id: string; name: string; status: string; total: number; answered: number; failed: number; leads: number }[];
  operatorStatistics: { id: string; name: string; total: number; new: number; interested: number; sold: number }[];
};

export function DashboardOverview() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const query = companyId ? `?companyId=${companyId}` : "";
    try { setData(await apiRequest<DashboardData>(`/api/dashboard/stats${query}`)); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [companyId, t]);
  useEffect(() => { void load(); }, [load]);

  return <><PageHeader title={t("pages.dashboard.title")} description={t("pages.dashboard.description")} action={companies.length > 0 ? <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</Select> : undefined} />{loading ? <ModuleLoading label={t("modules.common.loading")} /> : error || !data ? <ModuleError title={error || t("modules.common.error")} retry={() => void load()} retryLabel={t("modules.common.retry")} /> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={PhoneCall} label={t("dashboard.stats.totalCalls")} value={String(data.totals.totalCalls)} change="100%" /><StatCard icon={CheckCircle2} label={t("dashboard.stats.answeredCalls")} value={String(data.totals.answeredCalls)} change={rate(data.totals.answeredCalls, data.totals.totalCalls)} /><StatCard icon={XCircle} label={t("dashboard.stats.failedCalls")} value={String(data.totals.failedCalls)} change={rate(data.totals.failedCalls, data.totals.totalCalls)} /><StatCard icon={Target} label={t("dashboard.stats.leads")} value={String(data.totals.leads)} change={rate(data.totals.leads, data.totals.answeredCalls)} /><StatCard icon={TrendingUp} label={t("dashboard.stats.conversionRate")} value={`${data.totals.conversionRate}%`} change={t("dashboard.stats.conversion")} /></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("dashboard.campaignStats.title")}</CardTitle><CardDescription>{t("dashboard.campaignStats.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("dashboard.table.campaign")}</TableHead><TableHead>{t("dashboard.stats.totalCalls")}</TableHead><TableHead>{t("dashboard.stats.answeredCalls")}</TableHead><TableHead>{t("dashboard.stats.leads")}</TableHead></TableRow></TableHeader><TableBody>{data.campaignStatistics.map((campaign) => <TableRow key={campaign.id}><TableCell><p className="font-medium">{campaign.name}</p><Badge className="mt-1" variant="secondary">{t(`modules.campaigns.status.${campaign.status}`)}</Badge></TableCell><TableCell>{campaign.total}</TableCell><TableCell>{campaign.answered}</TableCell><TableCell>{campaign.leads}</TableCell></TableRow>)}</TableBody></Table>{data.campaignStatistics.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noStats")}</p>}</CardContent></Card><Card><CardHeader><CardTitle>{t("dashboard.operatorStats.title")}</CardTitle><CardDescription>{t("dashboard.operatorStats.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("dashboard.operatorStats.operator")}</TableHead><TableHead>{t("dashboard.operatorStats.total")}</TableHead><TableHead>{t("dashboard.operatorStats.interested")}</TableHead><TableHead>{t("dashboard.operatorStats.sold")}</TableHead></TableRow></TableHeader><TableBody>{data.operatorStatistics.map((operator) => <TableRow key={operator.id}><TableCell className="font-medium">{operator.name}</TableCell><TableCell>{operator.total}</TableCell><TableCell>{operator.interested}</TableCell><TableCell>{operator.sold}</TableCell></TableRow>)}</TableBody></Table>{data.operatorStatistics.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noStats")}</p>}</CardContent></Card></div></>}</>;
}

function rate(value: number, total: number) { return total ? `${Math.round((value / total) * 100)}%` : "0%"; }
