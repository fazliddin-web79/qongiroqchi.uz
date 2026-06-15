"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Bell, Clock3, Gauge, Save, Send } from "lucide-react";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type Settings = {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  defaultRetryCount: number;
  workingHours: { enabled?: boolean; start?: string; end?: string; days?: number[] };
  callSpeedLimit: number;
  defaultLanguage: string;
  timezone: string;
};
type Form = { telegramBotToken: string; telegramChatId: string; defaultRetryCount: string; workingEnabled: boolean; workingStart: string; workingEnd: string; workingDays: string; callSpeedLimit: string; defaultLanguage: string; timezone: string };

export function SettingsPage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId, companiesLoading } = useCompanyScope();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (companiesLoading) return;
    setLoading(true); setError("");
    try {
      const value = await apiRequest<Settings>(`/api/settings${companyId ? `?companyId=${companyId}` : ""}`);
      setForm({
        telegramBotToken: value.telegramBotToken ?? "", telegramChatId: value.telegramChatId ?? "", defaultRetryCount: String(value.defaultRetryCount),
        workingEnabled: value.workingHours?.enabled === true, workingStart: value.workingHours?.start ?? "09:00", workingEnd: value.workingHours?.end ?? "18:00", workingDays: (value.workingHours?.days ?? [1, 2, 3, 4, 5]).join(","),
        callSpeedLimit: String(value.callSpeedLimit), defaultLanguage: value.defaultLanguage, timezone: value.timezone,
      });
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [companiesLoading, companyId, t]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault(); if (!form) return; setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/settings", jsonRequest("PATCH", {
        companyId: companyId || undefined, telegramBotToken: form.telegramBotToken || null, telegramChatId: form.telegramChatId || null,
        defaultRetryCount: Number(form.defaultRetryCount), callSpeedLimit: Number(form.callSpeedLimit), defaultLanguage: form.defaultLanguage, timezone: form.timezone,
        workingHours: { enabled: form.workingEnabled, start: form.workingStart, end: form.workingEnd, days: form.workingDays.split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) },
      }));
      setNotice(t("modules.settings.saved"));
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  async function testTelegram() {
    setTesting(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/settings/telegram/test", jsonRequest("POST", { companyId: companyId || undefined }));
      setNotice(t("modules.settings.testSent"));
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setTesting(false); }
  }

  return <>
    <PageHeader title={t("pages.settings.title")} description={t("pages.settings.description")} />
    {companies.length > 0 && <Card className="mb-4"><CardContent className="flex justify-end p-4"><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></CardContent></Card>}
    {notice && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
    {loading || companiesLoading ? <ModuleLoading label={t("modules.common.loading")} /> : error && !form ? <ModuleError title={error} retry={() => void load()} retryLabel={t("modules.common.retry")} /> : form && <form className="space-y-5" onSubmit={save}>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-5 text-primary" />{t("modules.settings.telegram.title")}</CardTitle><CardDescription>{t("modules.settings.telegram.description")}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label={t("modules.settings.fields.telegramBotToken")}><Input type="password" value={form.telegramBotToken} onChange={(event) => setForm({ ...form, telegramBotToken: event.target.value })} /></Field><Field label={t("modules.settings.fields.telegramChatId")}><Input value={form.telegramChatId} onChange={(event) => setForm({ ...form, telegramChatId: event.target.value })} /></Field><div className="md:col-span-2"><Button type="button" variant="outline" disabled={testing} onClick={() => void testTelegram()}><Send className="size-4" />{testing ? t("modules.settings.testing") : t("modules.settings.test")}</Button></div></CardContent></Card>
      <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" />{t("modules.settings.working.title")}</CardTitle><CardDescription>{t("modules.settings.working.description")}</CardDescription></CardHeader><CardContent className="space-y-4"><label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium"><input type="checkbox" checked={form.workingEnabled} onChange={(event) => setForm({ ...form, workingEnabled: event.target.checked })} />{t("modules.settings.fields.workingEnabled")}</label><div className="grid gap-4 sm:grid-cols-2"><Field label={t("modules.settings.fields.workingStart")}><Input type="time" value={form.workingStart} onChange={(event) => setForm({ ...form, workingStart: event.target.value })} /></Field><Field label={t("modules.settings.fields.workingEnd")}><Input type="time" value={form.workingEnd} onChange={(event) => setForm({ ...form, workingEnd: event.target.value })} /></Field></div><Field label={t("modules.settings.fields.workingDays")}><Input value={form.workingDays} onChange={(event) => setForm({ ...form, workingDays: event.target.value })} placeholder="1,2,3,4,5" /></Field><Field label={t("modules.settings.fields.timezone")}><Input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} placeholder="Asia/Tashkent" /></Field></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-5 text-primary" />{t("modules.settings.calling.title")}</CardTitle><CardDescription>{t("modules.settings.calling.description")}</CardDescription></CardHeader><CardContent className="space-y-4"><Field label={t("modules.settings.fields.defaultRetryCount")}><Input type="number" min="0" max="10" value={form.defaultRetryCount} onChange={(event) => setForm({ ...form, defaultRetryCount: event.target.value })} /></Field><Field label={t("modules.settings.fields.callSpeedLimit")}><Input type="number" min="1" value={form.callSpeedLimit} onChange={(event) => setForm({ ...form, callSpeedLimit: event.target.value })} /></Field><Field label={t("modules.settings.fields.defaultLanguage")}><Select className="w-full" value={form.defaultLanguage} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value })}><option value="uz">{t("languages.uz")}</option><option value="en">{t("languages.en")}</option><option value="ru">{t("languages.ru")}</option></Select></Field></CardContent></Card></div>
      <div className="flex justify-end"><Button disabled={saving}><Save className="size-4" />{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div>
    </form>}
  </>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
