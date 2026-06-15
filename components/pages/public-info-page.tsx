"use client";

import { Inbox } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function PublicInfoPage({ page }: { page: "features" | "pricing" | "contact" }) {
  const { t } = useTranslations();
  return <main className="page-container min-h-[calc(100vh-8rem)] py-16"><PageHeader title={t(`publicPages.${page}.title`)} description={t(`publicPages.${page}.description`)} /><EmptyState icon={Inbox} title={t(`publicPages.${page}.emptyTitle`)} description={t(`publicPages.${page}.emptyDescription`)} action={t(`publicPages.${page}.action`)} /></main>;
}
