"use client";

import Link from "next/link";
import { useTranslations } from "@/components/providers/i18n-provider";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslations();
  return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-7xl font-bold text-primary">404</p><h1 className="mt-5 text-2xl font-bold">{t("notFound.title")}</h1><p className="mt-2 text-muted-foreground">{t("notFound.description")}</p><Link className={`${buttonVariants()} mt-6`} href="/">{t("notFound.action")}</Link></div></main>;
}
