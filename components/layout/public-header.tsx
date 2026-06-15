"use client";

import Link from "next/link";
import { useTranslations } from "@/components/providers/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { ThemeSwitcher } from "./theme-switcher";

export function PublicHeader() {
  const { t } = useTranslations();
  const links = ["features", "pricing", "contact"] as const;
  return <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur"><div className="page-container flex h-16 items-center"><Logo /><nav className="ml-10 hidden gap-6 md:flex">{links.map((item) => <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href={`/${item}`} key={item}>{t(`public.nav.${item}`)}</Link>)}</nav><div className="ml-auto flex items-center gap-1"><LanguageSwitcher /><ThemeSwitcher /><Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")} href="/login">{t("common.signIn")}</Link><Link className={buttonVariants({ size: "sm" })} href="/register">{t("common.getStarted")}</Link></div></div></header>;
}
