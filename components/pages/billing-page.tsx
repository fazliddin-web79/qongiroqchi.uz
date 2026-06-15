"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CreditCard, Pencil, Plus, Trash2, Users, Megaphone, PhoneCall } from "lucide-react";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type Plan = { id: string; name: string; monthlyPrice: string | number; callLimit: number; userLimit: number; campaignLimit: number; features: unknown; _count?: { subscriptions: number } };
type Subscription = { id: string; status: string; startsAt: string; endsAt: string; plan: Plan; company: { id: string; name: string } };
type PlanForm = { name: string; monthlyPrice: string; callLimit: string; userLimit: string; campaignLimit: string; features: string };
const EMPTY_PLAN: PlanForm = { name: "", monthlyPrice: "0", callLimit: "1000", userLimit: "5", campaignLimit: "5", features: "{}" };

export function BillingPage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usage, setUsage] = useState<{ calls: number; users: number; campaigns: number } | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [planModal, setPlanModal] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN);
  const [subscriptionForm, setSubscriptionForm] = useState({ planId: "", startsAt: dateInput(new Date()), endsAt: dateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), status: "ACTIVE" });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [planResult, subscriptionResult] = await Promise.all([
        apiRequest<{ items: Plan[]; canManage: boolean }>("/api/billing/plans"),
        apiRequest<{ items: Subscription[]; usage: typeof usage; canManage: boolean }>(`/api/billing/subscriptions${companyId ? `?companyId=${companyId}` : ""}`),
      ]);
      setPlans(planResult.items); setCanManage(planResult.canManage); setSubscriptions(subscriptionResult.items); setUsage(subscriptionResult.usage);
      setSubscriptionForm((current) => ({ ...current, planId: current.planId || planResult.items[0]?.id || "" }));
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [companyId, t]);

  useEffect(() => { void load(); }, [load]);

  function openPlan(plan?: Plan) {
    setEditing(plan ?? null); setModalError("");
    setPlanForm(plan ? { name: plan.name, monthlyPrice: String(plan.monthlyPrice), callLimit: String(plan.callLimit), userLimit: String(plan.userLimit), campaignLimit: String(plan.campaignLimit), features: JSON.stringify(plan.features ?? {}, null, 2) } : EMPTY_PLAN);
    setPlanModal(true);
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      const payload = { name: planForm.name, monthlyPrice: Number(planForm.monthlyPrice), callLimit: Number(planForm.callLimit), userLimit: Number(planForm.userLimit), campaignLimit: Number(planForm.campaignLimit), features: JSON.parse(planForm.features || "{}") };
      await apiRequest(editing ? `/api/billing/plans/${editing.id}` : "/api/billing/plans", jsonRequest(editing ? "PATCH" : "POST", payload));
      setPlanModal(false); setNotice(t(editing ? "modules.billing.planUpdated" : "modules.billing.planCreated")); await load();
    } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  async function deletePlan(plan: Plan) {
    if (!window.confirm(t("modules.billing.deleteConfirm"))) return;
    try { await apiRequest(`/api/billing/plans/${plan.id}`, jsonRequest("DELETE")); await load(); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); }
  }

  async function assignSubscription(event: FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      await apiRequest("/api/billing/subscriptions", jsonRequest("POST", { companyId, planId: subscriptionForm.planId, status: subscriptionForm.status, startsAt: new Date(subscriptionForm.startsAt).toISOString(), endsAt: new Date(subscriptionForm.endsAt).toISOString() }));
      setSubscriptionModal(false); setNotice(t("modules.billing.assigned")); await load();
    } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  return <>
    <PageHeader title={t("pages.billing.title")} description={t("pages.billing.description")} action={canManage ? <div className="flex gap-2"><Button variant="outline" disabled={!companyId} onClick={() => { setModalError(""); setSubscriptionModal(true); }}><CreditCard className="size-4" />{t("modules.billing.assignPlan")}</Button><Button onClick={() => openPlan()}><Plus className="size-4" />{t("modules.billing.createPlan")}</Button></div> : undefined} />
    {companies.length > 0 && <Card className="mb-4"><CardContent className="flex justify-end p-4"><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></CardContent></Card>}
    {notice && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
    {loading ? <ModuleLoading label={t("modules.common.loading")} /> : error ? <ModuleError title={error} retry={() => void load()} retryLabel={t("modules.common.retry")} /> : <>
      {usage && <div className="mb-5 grid gap-4 md:grid-cols-3"><Usage icon={PhoneCall} label={t("modules.billing.usage.calls")} value={usage.calls} /><Usage icon={Users} label={t("modules.billing.usage.users")} value={usage.users} /><Usage icon={Megaphone} label={t("modules.billing.usage.campaigns")} value={usage.campaigns} /></div>}
      <Card className="mb-5"><CardHeader><CardTitle>{t("modules.billing.plans")}</CardTitle></CardHeader><Table><TableHeader><TableRow><TableHead>{t("modules.billing.fields.name")}</TableHead><TableHead>{t("modules.billing.fields.price")}</TableHead><TableHead>{t("modules.billing.fields.callLimit")}</TableHead><TableHead>{t("modules.billing.fields.userLimit")}</TableHead><TableHead>{t("modules.billing.fields.campaignLimit")}</TableHead>{canManage && <TableHead className="text-right">{t("modules.common.actions")}</TableHead>}</TableRow></TableHeader><TableBody>{plans.map((plan) => <TableRow key={plan.id}><TableCell className="font-medium">{plan.name}</TableCell><TableCell>${Number(plan.monthlyPrice).toLocaleString()}</TableCell><TableCell>{plan.callLimit.toLocaleString()}</TableCell><TableCell>{plan.userLimit}</TableCell><TableCell>{plan.campaignLimit}</TableCell>{canManage && <TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={t("modules.common.edit")} onClick={() => openPlan(plan)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={t("modules.common.delete")} onClick={() => void deletePlan(plan)}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell>}</TableRow>)}</TableBody></Table></Card>
      <Card><CardHeader><CardTitle>{t("modules.billing.subscriptions")}</CardTitle></CardHeader><Table><TableHeader><TableRow><TableHead>{t("modules.billing.fields.company")}</TableHead><TableHead>{t("modules.billing.fields.plan")}</TableHead><TableHead>{t("modules.billing.fields.status")}</TableHead><TableHead>{t("modules.billing.fields.period")}</TableHead></TableRow></TableHeader><TableBody>{subscriptions.map((item) => <TableRow key={item.id}><TableCell>{item.company.name}</TableCell><TableCell>{item.plan.name}</TableCell><TableCell><Badge variant={["ACTIVE", "TRIAL"].includes(item.status) ? "success" : "warning"}>{t(`modules.billing.status.${item.status}`)}</Badge></TableCell><TableCell>{new Date(item.startsAt).toLocaleDateString()} - {new Date(item.endsAt).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table></Card>
    </>}
    <Modal open={planModal} onClose={() => setPlanModal(false)} title={t(editing ? "modules.billing.editPlan" : "modules.billing.createPlan")} closeLabel={t("common.close")}><form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={savePlan}><Field label={t("modules.billing.fields.name")}><Input required value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} /></Field><Field label={t("modules.billing.fields.price")}><Input type="number" min="0" step="0.01" value={planForm.monthlyPrice} onChange={(event) => setPlanForm({ ...planForm, monthlyPrice: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label={t("modules.billing.fields.callLimit")}><Input type="number" min="0" value={planForm.callLimit} onChange={(event) => setPlanForm({ ...planForm, callLimit: event.target.value })} /></Field><Field label={t("modules.billing.fields.userLimit")}><Input type="number" min="0" value={planForm.userLimit} onChange={(event) => setPlanForm({ ...planForm, userLimit: event.target.value })} /></Field><Field label={t("modules.billing.fields.campaignLimit")}><Input type="number" min="0" value={planForm.campaignLimit} onChange={(event) => setPlanForm({ ...planForm, campaignLimit: event.target.value })} /></Field></div><Field label={t("modules.billing.fields.features")}><Textarea value={planForm.features} onChange={(event) => setPlanForm({ ...planForm, features: event.target.value })} /></Field><Footer error={modalError} saving={saving} cancel={() => setPlanModal(false)} t={t} /></form></Modal>
    <Modal open={subscriptionModal} onClose={() => setSubscriptionModal(false)} title={t("modules.billing.assignPlan")} closeLabel={t("common.close")}><form className="space-y-4" onSubmit={assignSubscription}><Field label={t("modules.billing.fields.plan")}><Select className="w-full" value={subscriptionForm.planId} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, planId: event.target.value })}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t("modules.billing.fields.startsAt")}><Input type="datetime-local" value={subscriptionForm.startsAt} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, startsAt: event.target.value })} /></Field><Field label={t("modules.billing.fields.endsAt")}><Input type="datetime-local" value={subscriptionForm.endsAt} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, endsAt: event.target.value })} /></Field></div><Footer error={modalError} saving={saving} cancel={() => setSubscriptionModal(false)} t={t} /></form></Modal>
  </>;
}

function Usage({ icon: Icon, label, value }: { icon: typeof PhoneCall; label: string; value: number }) { return <Card><CardContent className="p-5"><Icon className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p></CardContent></Card>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function Footer({ error, saving, cancel, t }: { error: string; saving: boolean; cancel: () => void; t: (key: string) => string }) { return <>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={cancel}>{t("modules.common.cancel")}</Button><Button disabled={saving}>{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div></>; }
function dateInput(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
