"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { t } = useTranslations();
  const { setTheme } = useTheme();
  return (
    <Dropdown trigger={<Button variant="ghost" size="icon" aria-label={t("common.theme")}><Sun className="size-4 dark:hidden" /><Moon className="hidden size-4 dark:block" /></Button>}>
      <DropdownItem onClick={() => setTheme("light")}><Sun className="size-4" />{t("themes.light")}</DropdownItem>
      <DropdownItem onClick={() => setTheme("dark")}><Moon className="size-4" />{t("themes.dark")}</DropdownItem>
      <DropdownItem onClick={() => setTheme("system")}><Laptop className="size-4" />{t("themes.system")}</DropdownItem>
    </Dropdown>
  );
}
