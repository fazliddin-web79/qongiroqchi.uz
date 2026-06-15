"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Megaphone, Pencil, Play, Plus, Search, Trash2, Upload } from "lucide-react";
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
import { apiRequest, jsonRequest } from "@/lib/api/client";
import { useCompanyScope } from "@/hooks/use-company-scope";

type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";
type Group = { id: string; name: string; _count: { contacts: number } };
type Campaign = { id: string; name: string; description: string | null; audioUrl: string | null; contactGroupId: string; status: CampaignStatus; startTime: string | null; retryEnabled: boolean; retryCount: number; ivrSettings: unknown; contactGroup: Group; createdBy: { name: string }; company?: { name: string } };
type PaginatedCampaigns = { items: Campaign[]; pagination: { page: number; pages: number; total: number; limit: number } };
type CampaignForm = { name: string; description: string; contactGroupId: string; status: CampaignStatus; startTime: string; retryEnabled: boolean; retryCount: string; ivrSettings: string; audioUrl: string };

const STATUSES: CampaignStatus[] = ["DRAFT", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "FAILED"];
const EMPTY_FORM: CampaignForm = { name: "", description: "", contactGroupId: "", status: "DRAFT", startTime: "", retryEnabled: false, retryCount: "0", ivrSettings: "{}", audioUrl: "" };

export function CampaignsPage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [audio, setAudio] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadGroups = useCallback(async () => {
    const query = companyId ? `?companyId=${companyId}` : "";
    try { setGroups(await apiRequest<Group[]>(`/api/contact-groups${query}`)); } catch { /* The main request displays auth/database errors. */ }
  }, [companyId]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    if (groupId) query.set("contactGroupId", groupId);
    if (companyId) query.set("companyId", companyId);
    try {
      const result = await apiRequest<PaginatedCampaigns>(`/api/campaigns?${query}`);
      setCampaigns(result.items); setPagination(result.pagination);
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [companyId, groupId, page, search, status, t]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => { const timeout = window.setTimeout(() => void loadCampaigns(), 250); return () => window.clearTimeout(timeout); }, [loadCampaigns]);

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setAudio(null); setModalError(""); setModalOpen(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setForm({ name: campaign.name, description: campaign.description ?? "", contactGroupId: campaign.contactGroupId, status: campaign.status, startTime: campaign.startTime ? new Date(campaign.startTime).toISOString().slice(0, 16) : "", retryEnabled: campaign.retryEnabled, retryCount: String(campaign.retryCount), ivrSettings: JSON.stringify(campaign.ivrSettings ?? {}, null, 2), audioUrl: campaign.audioUrl ?? "" });
    setAudio(null); setModalError(""); setModalOpen(true);
  }

  async function uploadAudio() {
    if (!audio) return form.audioUrl || null;
    const data = new FormData(); data.set("file", audio);
    const result = await apiRequest<{ audioUrl: string }>("/api/campaigns/upload-audio", { method: "POST", body: data });
    return result.audioUrl;
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      const audioUrl = await uploadAudio();
      const ivrSettings = JSON.parse(form.ivrSettings || "{}") as Record<string, unknown>;
      const payload = { ...form, companyId: companyId || undefined, audioUrl, description: form.description || null, startTime: form.startTime ? new Date(form.startTime).toISOString() : null, retryCount: Number(form.retryCount), ivrSettings };
      await apiRequest(editing ? `/api/campaigns/${editing.id}` : "/api/campaigns", jsonRequest(editing ? "PATCH" : "POST", payload));
      setModalOpen(false); setNotice(t(editing ? "modules.campaigns.updated" : "modules.campaigns.created")); await loadCampaigns();
    } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  async function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(t("modules.campaigns.deleteConfirm"))) return;
    try { await apiRequest(`/api/campaigns/${campaign.id}`, jsonRequest("DELETE")); setNotice(t("modules.campaigns.deleted")); await loadCampaigns(); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); }
  }

  async function startCampaign(campaign: Campaign) {
    try {
      const result = await apiRequest<{ createdCalls: number }>(`/api/campaigns/${campaign.id}/start`, jsonRequest("POST"));
      setNotice(`${t("modules.campaigns.started")}: ${result.createdCalls}`);
      await loadCampaigns();
    } catch (value) {
      setError(value instanceof Error ? value.message : t("modules.common.error"));
    }
  }

  return <>
    <PageHeader title={t("pages.campaigns.title")} description={t("pages.campaigns.description")} action={<Button onClick={openCreate}><Plus className="size-4" />{t("pages.campaigns.action")}</Button>} />
    {notice && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
    <Card className="mb-4"><CardContent className="flex flex-wrap gap-3 p-4"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("modules.campaigns.search")} /></label>{companies.length > 0 && <Select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setGroupId(""); setPage(1); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>}<Select value={groupId} onChange={(event) => { setGroupId(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allGroups")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select><Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allStatuses")}</option>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.campaigns.status.${item}`)}</option>)}</Select></CardContent></Card>
    {loading ? <ModuleLoading label={t("modules.common.loading")} /> : error ? <ModuleError title={error} retry={() => void loadCampaigns()} retryLabel={t("modules.common.retry")} /> : campaigns.length === 0 ? <EmptyState icon={Megaphone} title={t("pages.campaigns.emptyTitle")} description={t("pages.campaigns.emptyDescription")} action={t("pages.campaigns.action")} /> : <Card><Table><TableHeader><TableRow><TableHead>{t("modules.campaigns.fields.name")}</TableHead><TableHead>{t("modules.campaigns.fields.group")}</TableHead><TableHead>{t("modules.campaigns.fields.status")}</TableHead><TableHead>{t("modules.campaigns.fields.startTime")}</TableHead><TableHead>{t("modules.campaigns.fields.createdBy")}</TableHead><TableHead className="text-right">{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{campaigns.map((campaign) => <TableRow key={campaign.id}><TableCell className="font-medium">{campaign.name}</TableCell><TableCell>{campaign.contactGroup.name}<span className="ml-1 text-xs text-muted-foreground">({campaign.contactGroup._count?.contacts ?? 0})</span></TableCell><TableCell><Badge variant={campaignVariant(campaign.status)}>{t(`modules.campaigns.status.${campaign.status}`)}</Badge></TableCell><TableCell>{campaign.startTime ? new Date(campaign.startTime).toLocaleString() : t("modules.campaigns.notScheduled")}</TableCell><TableCell>{campaign.createdBy.name}</TableCell><TableCell><div className="flex justify-end gap-1">{campaign.status !== "RUNNING" && campaign.status !== "COMPLETED" && <Button size="icon" variant="ghost" aria-label={t("modules.campaigns.start")} onClick={() => void startCampaign(campaign)}><Play className="size-4 text-primary" /></Button>}<Button size="icon" variant="ghost" aria-label={t("modules.common.edit")} onClick={() => openEdit(campaign)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={t("modules.common.delete")} onClick={() => void deleteCampaign(campaign)}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell></TableRow>)}</TableBody></Table><CardContent><PaginationControls page={pagination.page} pages={pagination.pages} onPage={setPage} previousLabel={t("modules.common.previous")} nextLabel={t("modules.common.next")} /></CardContent></Card>}

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t(editing ? "modules.campaigns.editTitle" : "modules.campaigns.createTitle")} closeLabel={t("common.close")}><form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={saveCampaign}><Field label={t("modules.campaigns.fields.name")}><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label={t("modules.campaigns.fields.description")}><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label={t("modules.campaigns.fields.group")}><Select className="w-full" required value={form.contactGroupId} onChange={(event) => setForm({ ...form, contactGroupId: event.target.value })}><option value="">{t("modules.campaigns.selectGroup")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t("modules.campaigns.fields.status")}><Select className="w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CampaignStatus })}>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.campaigns.status.${item}`)}</option>)}</Select></Field><Field label={t("modules.campaigns.fields.startTime")}><Input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field></div><Field label={t("modules.campaigns.fields.audio")}><div className="rounded-lg border border-dashed p-3"><label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><Upload className="size-4 text-primary" /><span>{audio?.name ?? form.audioUrl ?? t("modules.campaigns.chooseAudio")}</span><input className="hidden" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={(event) => setAudio(event.target.files?.[0] ?? null)} /></label></div></Field><label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium"><input type="checkbox" checked={form.retryEnabled} onChange={(event) => setForm({ ...form, retryEnabled: event.target.checked })} />{t("modules.campaigns.fields.retryEnabled")}</label>{form.retryEnabled && <Field label={t("modules.campaigns.fields.retryCount")}><Input type="number" min="0" max="10" value={form.retryCount} onChange={(event) => setForm({ ...form, retryCount: event.target.value })} /></Field>}<Field label={t("modules.campaigns.fields.ivrSettings")}><Textarea value={form.ivrSettings} onChange={(event) => setForm({ ...form, ivrSettings: event.target.value })} /></Field>{modalError && <p className="text-sm text-destructive">{modalError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t("modules.common.cancel")}</Button><Button disabled={saving}>{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div></form></Modal>
  </>;
}

function campaignVariant(status: CampaignStatus): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (status === "RUNNING" || status === "COMPLETED") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "SCHEDULED" || status === "PAUSED") return "warning";
  return "secondary";
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
