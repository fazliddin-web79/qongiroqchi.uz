"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, jsonRequest } from "@/lib/api/client";

export function AuthPage({ page }: { page: "login" | "register" | "forgotPassword" }) {
  const { t } = useTranslations();
  const router = useRouter();
  const register = page === "register";
  const forgot = page === "forgotPassword";
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (forgot) return;
    setSubmitting(true); setError("");
    try {
      const endpoint = register ? "/api/auth/register" : "/api/auth/login";
      const payload = register ? { name: form.name, companyName: form.company, email: form.email, password: form.password } : { email: form.email, password: form.password };
      await apiRequest(endpoint, jsonRequest("POST", payload));
      router.push("/dashboard");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : t("modules.common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return <div><h1 className="text-2xl font-bold">{t(`auth.${page}.title`)}</h1><p className="mt-2 text-sm text-muted-foreground">{t(`auth.${page}.description`)}</p><form className="mt-7 space-y-4" onSubmit={submit}>{register && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.name")}</span><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("auth.placeholders.name")} /></label>}{register && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.company")}</span><Input required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder={t("auth.placeholders.company")} /></label>}<label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.email")}</span><Input required={!forgot} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" placeholder={t("auth.placeholders.email")} /></label>{!forgot && <label className="block space-y-2 text-sm font-medium"><span>{t("auth.fields.password")}</span><Input required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" placeholder={t("auth.placeholders.password")} /></label>}{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={submitting} type={forgot ? "button" : "submit"}>{submitting ? t("modules.common.saving") : t(`auth.${page}.submit`)}</Button></form>{page === "login" && <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">{t("auth.login.registerPrompt")}</span><Link className="font-medium text-primary" href="/register">{t("auth.login.registerLink")}</Link></div>}{page === "login" && <Link className="mt-4 block text-center text-sm text-primary" href="/forgot-password">{t("auth.login.forgotLink")}</Link>}{register && <p className="mt-4 text-center text-sm text-muted-foreground">{t("auth.register.loginPrompt")} <Link className="font-medium text-primary" href="/login">{t("auth.register.loginLink")}</Link></p>}{forgot && <p className="mt-4 text-center text-sm"><Link className="font-medium text-primary" href="/login">{t("auth.forgotPassword.backLink")}</Link></p>}</div>;
}
