"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, ContactRound, CreditCard, FileCheck2, FileWarning, Headphones, History, ListRestart, Megaphone, PhoneCall, Settings, Target, Users, X } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const items = [
  { key: "dashboard", href: "/dashboard", icon: BarChart3 },
  { key: "companies", href: "/dashboard/companies", icon: Building2 },
  { key: "users", href: "/dashboard/users", icon: Users },
  { key: "campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { key: "moderation", href: "/dashboard/moderation", icon: FileCheck2 },
  { key: "contacts", href: "/dashboard/contacts", icon: ContactRound },
  { key: "calls", href: "/dashboard/calls", icon: PhoneCall },
  { key: "leads", href: "/dashboard/leads", icon: Target },
  { key: "operator", href: "/dashboard/operator", icon: Headphones },
  { key: "queue", href: "/dashboard/queue", icon: ListRestart },
  { key: "errors", href: "/dashboard/errors", icon: FileWarning },
  { key: "auditLogs", href: "/dashboard/audit-logs", icon: History },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
  { key: "billing", href: "/dashboard/billing", icon: CreditCard },
] as const;

export function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslations();
  return <>
    {open && <button className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" aria-label={t("common.close")} onClick={onClose} />}
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r bg-card p-4 transition-transform lg:translate-x-0", open && "translate-x-0")}>
      <div className="mb-6 flex items-center justify-between"><Logo /><Button className="lg:hidden" variant="ghost" size="icon" aria-label={t("common.close")} onClick={onClose}><X className="size-4" /></Button></div>
      <nav className="space-y-1">{items.map(({ key, href, icon: Icon }) => { const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href); return <Link href={href} key={key} onClick={onClose} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary")}><Icon className="size-4" />{t(`nav.${key}`)}</Link>; })}</nav>
      <div className="mt-auto rounded-lg bg-muted p-3"><p className="text-sm font-medium">{t("sidebar.helpTitle")}</p><p className="mt-1 text-xs text-muted-foreground">{t("sidebar.helpDescription")}</p></div>
    </aside>
  </>;
}
