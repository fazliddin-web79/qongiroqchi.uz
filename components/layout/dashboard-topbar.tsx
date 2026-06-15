"use client";

import { LogOut, Menu, Search, UserRound } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function DashboardTopbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslations();
  return <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6"><Button className="lg:hidden" variant="ghost" size="icon" aria-label={t("common.menu")} onClick={onMenu}><Menu className="size-5" /></Button><div className="relative hidden w-full max-w-sm sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={t("topbar.search")} /></div><div className="ml-auto flex items-center gap-1"><LanguageSwitcher /><ThemeSwitcher /><Dropdown trigger={<Button variant="ghost" className="gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{t("profile.initials")}</span><span className="hidden sm:block">{t("profile.name")}</span></Button>}><DropdownItem><UserRound className="size-4" />{t("profile.profile")}</DropdownItem><DropdownItem><LogOut className="size-4" />{t("common.signOut")}</DropdownItem></Dropdown></div></header>;
}
