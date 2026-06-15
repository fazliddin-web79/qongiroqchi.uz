import type { Locale } from "@/types/i18n";

export const locales: Locale[] = ["uz", "en", "ru"];
export const defaultLocale: Locale = "uz";
export const localeCookie = "autocall-locale";

export function isLocale(value?: string): value is Locale {
  return locales.includes(value as Locale);
}
