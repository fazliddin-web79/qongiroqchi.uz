"use client";

import Link from "next/link";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPage({ page }: { page: "login" | "register" | "forgotPassword" }) {
  const { t } = useTranslations();
  const register = page === "register";
  const forgot = page === "forgotPassword";
  return <div><h1 className="text-2xl font-bold">{t(`auth.${page}.title`)}</h1><p className="mt-2 text-sm text-muted-foreground">{t(`auth.${page}.description`)}</p><form className="mt-7 space-y-4">{register && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.name")}</span><Input placeholder={t("auth.placeholders.name")} /></label>}{register && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.company")}</span><Input placeholder={t("auth.placeholders.company")} /></label>}<label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.email")}</span><Input type="email" placeholder={t("auth.placeholders.email")} /></label>{!forgot && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.password")}</span><Input type="password" placeholder={t("auth.placeholders.password")} /></label>}<Button className="w-full" type="button">{t(`auth.${page}.submit`)}</Button></form>{page === "login" && <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">{t("auth.login.registerPrompt")}</span><Link className="font-medium text-primary" href="/register">{t("auth.login.registerLink")}</Link></div>}{page === "login" && <Link className="mt-4 block text-center text-sm text-primary" href="/forgot-password">{t("auth.login.forgotLink")}</Link>}{register && <p className="mt-4 text-center text-sm text-muted-foreground">{t("auth.register.loginPrompt")} <Link className="font-medium text-primary" href="/login">{t("auth.register.loginLink")}</Link></p>}{forgot && <p className="mt-4 text-center text-sm"><Link className="font-medium text-primary" href="/login">{t("auth.forgotPassword.backLink")}</Link></p>}</div>;
}
