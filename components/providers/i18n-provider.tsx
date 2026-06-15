"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale, Messages } from "@/types/i18n";

type I18nContextValue = {
  locale: Locale;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(messages: Messages, key: string) {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, messages);
  return typeof value === "string" ? value : key;
}

export function I18nProvider({ children, locale, messages }: { children: ReactNode; locale: Locale; messages: Messages }) {
  return <I18nContext.Provider value={{ locale, t: (key) => resolve(messages, key) }}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useTranslations must be used inside I18nProvider");
  return context;
}
