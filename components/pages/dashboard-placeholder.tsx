"use client";

import { Plus, Inbox } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export type DashboardPageKey = "companies" | "users" | "campaigns" | "contacts" | "calls" | "leads" | "errors" | "auditLogs" | "settings" | "billing";

export function DashboardPlaceholder({ page }: { page: DashboardPageKey }) {
  const { t } = useTranslations();
  return <><PageHeader title={t(`pages.${page}.title`)} description={t(`pages.${page}.description`)} action={<Button><Plus className="size-4" />{t(`pages.${page}.action`)}</Button>} /><EmptyState icon={Inbox} title={t(`pages.${page}.emptyTitle`)} description={t(`pages.${page}.emptyDescription`)} action={t(`pages.${page}.action`)} /></>;
}
