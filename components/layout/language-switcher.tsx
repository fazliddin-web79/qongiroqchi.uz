"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { localeCookie, locales } from "@/lib/i18n/config";
import type { Locale } from "@/types/i18n";

export function LanguageSwitcher() {
  const { locale, t } = useTranslations();
  const router = useRouter();
  const changeLocale = (next: Locale) => {
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <Dropdown trigger={<Button variant="ghost" size="icon" aria-label={t("common.language")}><Languages className="size-4" /></Button>}>
      {locales.map((item) => <DropdownItem key={item} onClick={() => changeLocale(item)}><span className={item === locale ? "font-semibold text-primary" : ""}>{t(`languages.${item}`)}</span></DropdownItem>)}
    </Dropdown>
  );
}
