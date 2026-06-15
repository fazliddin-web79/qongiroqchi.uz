"use client";

import { useTranslations } from "@/components/providers/i18n-provider";
import { Logo } from "./logo";

export function PublicFooter() {
  const { t } = useTranslations();
  return <footer className="border-t"><div className="page-container flex flex-col gap-4 py-8 sm:flex-row sm:items-center"><Logo /><p className="text-sm text-muted-foreground">{t("footer.tagline")}</p><p className="text-sm text-muted-foreground sm:ml-auto">{t("footer.rights")}</p></div></footer>;
}
