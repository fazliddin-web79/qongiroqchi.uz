"use client";

import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslations();
  return <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><PhoneCall className="size-5" /></span>{!compact && <span className={cn("text-lg")}>{t("brand.name")}</span>}</Link>;
}
