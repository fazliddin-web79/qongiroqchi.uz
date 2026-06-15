"use client";

import { Building2, Megaphone, PhoneCall, Target } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const stats = [{ key: "companies", icon: Building2, value: "24", change: "+12%" }, { key: "campaigns", icon: Megaphone, value: "86", change: "+8%" }, { key: "calls", icon: PhoneCall, value: "12,480", change: "+18%" }, { key: "leads", icon: Target, value: "1,204", change: "+6%" }] as const;
const rows = ["summer", "welcome", "payment"] as const;

export function DashboardOverview() {
  const { t } = useTranslations();
  return <><PageHeader title={t("pages.dashboard.title")} description={t("pages.dashboard.description")} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ key, icon, value, change }) => <StatCard key={key} icon={icon} label={t(`dashboard.stats.${key}`)} value={value} change={change} />)}</div><Card className="mt-6"><CardHeader><CardTitle>{t("dashboard.recent.title")}</CardTitle><CardDescription>{t("dashboard.recent.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("dashboard.table.campaign")}</TableHead><TableHead>{t("dashboard.table.company")}</TableHead><TableHead>{t("dashboard.table.calls")}</TableHead><TableHead>{t("dashboard.table.status")}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row}><TableCell className="font-medium">{t(`dashboard.rows.${row}.campaign`)}</TableCell><TableCell>{t(`dashboard.rows.${row}.company`)}</TableCell><TableCell>{t(`dashboard.rows.${row}.calls`)}</TableCell><TableCell><StatusBadge status={row === "payment" ? "pending" : "active"} label={t(row === "payment" ? "status.pending" : "status.active")} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>;
}
