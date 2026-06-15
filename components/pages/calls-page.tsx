"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Pencil, PhoneCall, Search } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading, PaginationControls } from "@/components/pages/module-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type CallStatus = "PENDING" | "CALLING" | "ANSWERED" | "NOT_ANSWERED" | "BUSY" | "FAILED" | "COMPLETED";
type Call = { id: string; phone: string; status: CallStatus; duration: number | null; pressedKey: string | null; errorMessage: string | null; attemptCount: number; createdAt: string; contact: { fullName: string }; campaign: { id: string; name: string }; lead: { id: string; status: string } | null };
type Campaign = { id: string; name: string };
type PaginatedCalls = { items: Call[]; pagination: { page: number; pages: number; total: number; limit: number } };
const STATUSES: CallStatus[] = ["PENDING", "CALLING", "ANSWERED", "NOT_ANSWERED", "BUSY", "FAILED", "COMPLETED"];

export function CallsPage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [items, setItems] = useState<Call[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Call | null>(null);
  const [form, setForm] = useState({ status: "PENDING" as CallStatus, duration: "", pressedKey: "", errorMessage: "", createLead: false });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadCampaigns = useCallback(async () => {
    const query = new URLSearchParams({ limit: "100" }); if (companyId) query.set("companyId", companyId);
    try { setCampaigns((await apiRequest<{ items: Campaign[] }>(`/api/campaigns?${query}`)).items); } catch { /* Main request shows the error state. */ }
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (companyId) query.set("companyId", companyId); if (search.trim()) query.set("search", search.trim()); if (status) query.set("status", status); if (campaignId) query.set("campaignId", campaignId);
    try { const result = await apiRequest<PaginatedCalls>(`/api/calls?${query}`); setItems(result.items); setPagination(result.pagination); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [campaignId, companyId, page, search, status, t]);

  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { const timeout = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timeout); }, [load]);

  function openEdit(call: Call) {
    setEditing(call); setForm({ status: call.status, duration: call.duration === null ? "" : String(call.duration), pressedKey: call.pressedKey ?? "", errorMessage: call.errorMessage ?? "", createLead: false }); setModalError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (!editing) return; setSaving(true); setModalError("");
    try { await apiRequest(`/api/calls/${editing.id}`, jsonRequest("PATCH", { status: form.status, duration: form.duration ? Number(form.duration) : undefined, pressedKey: form.pressedKey || null, errorMessage: form.errorMessage || null, createLead: form.createLead })); setEditing(null); await load(); } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  return <><PageHeader title={t("pages.calls.title")} description={t("pages.calls.description")} /><Card className="mb-4"><CardContent className="flex flex-wrap gap-3 p-4"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("modules.calls.search")} /></label>{companies.length > 0 && <Select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setCampaignId(""); setPage(1); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>}<Select value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setPage(1); }}><option value="">{t("modules.calls.allCampaigns")}</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select><Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allStatuses")}</option>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.calls.status.${item}`)}</option>)}</Select></CardContent></Card>{loading ? <ModuleLoading label={t("modules.common.loading")} /> : error ? <ModuleError title={error} retry={() => void load()} retryLabel={t("modules.common.retry")} /> : items.length === 0 ? <EmptyState icon={PhoneCall} title={t("pages.calls.emptyTitle")} description={t("pages.calls.emptyDescription")} /> : <Card><Table><TableHeader><TableRow><TableHead>{t("modules.calls.fields.contact")}</TableHead><TableHead>{t("modules.calls.fields.campaign")}</TableHead><TableHead>{t("modules.calls.fields.phone")}</TableHead><TableHead>{t("modules.calls.fields.status")}</TableHead><TableHead>{t("modules.calls.fields.duration")}</TableHead><TableHead>{t("modules.calls.fields.lead")}</TableHead><TableHead className="text-right">{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{items.map((call) => <TableRow key={call.id}><TableCell className="font-medium">{call.contact.fullName}</TableCell><TableCell>{call.campaign.name}</TableCell><TableCell>{call.phone}</TableCell><TableCell><Badge variant={callVariant(call.status)}>{t(`modules.calls.status.${call.status}`)}</Badge></TableCell><TableCell>{call.duration ?? 0} {t("modules.calls.seconds")}</TableCell><TableCell>{call.lead ? t("modules.calls.leadCreated") : "-"}</TableCell><TableCell><div className="flex justify-end"><Button size="icon" variant="ghost" aria-label={t("modules.common.edit")} onClick={() => openEdit(call)}><Pencil className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table><CardContent><PaginationControls page={pagination.page} pages={pagination.pages} onPage={setPage} previousLabel={t("modules.common.previous")} nextLabel={t("modules.common.next")} /></CardContent></Card>}<Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t("modules.calls.updateTitle")} closeLabel={t("common.close")}><form className="space-y-4" onSubmit={save}><Field label={t("modules.calls.fields.status")}><Select className="w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CallStatus })}>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.calls.status.${item}`)}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t("modules.calls.fields.duration")}><Input type="number" min="0" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></Field><Field label={t("modules.calls.fields.pressedKey")}><Input value={form.pressedKey} onChange={(event) => setForm({ ...form, pressedKey: event.target.value })} /></Field></div><Field label={t("modules.calls.fields.errorMessage")}><Textarea value={form.errorMessage} onChange={(event) => setForm({ ...form, errorMessage: event.target.value })} /></Field><label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium"><input type="checkbox" checked={form.createLead} onChange={(event) => setForm({ ...form, createLead: event.target.checked })} />{t("modules.calls.createLead")}</label>{modalError && <p className="text-sm text-destructive">{modalError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("modules.common.cancel")}</Button><Button disabled={saving}>{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div></form></Modal></>;
}

function callVariant(status: CallStatus): "default" | "secondary" | "success" | "warning" | "destructive" { if (["ANSWERED", "COMPLETED"].includes(status)) return "success"; if (status === "FAILED") return "destructive"; if (["NOT_ANSWERED", "BUSY"].includes(status)) return "warning"; return "secondary"; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
