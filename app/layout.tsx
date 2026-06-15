import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { getLocale, getMessages } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "AutoCall CRM", template: "%s | AutoCall CRM" },
  description: "Auto-calling CRM SaaS platform",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <AppProviders locale={locale} messages={messages}>{children}</AppProviders>
      </body>
    </html>
  );
}
