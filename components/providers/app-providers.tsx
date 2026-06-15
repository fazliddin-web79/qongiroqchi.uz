"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "./i18n-provider";
import { ThemeProvider } from "./theme-provider";
import type { Locale, Messages } from "@/types/i18n";

export function AppProviders({ children, locale, messages }: { children: ReactNode; locale: Locale; messages: Messages }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} messages={messages}>{children}</I18nProvider>
    </ThemeProvider>
  );
}
