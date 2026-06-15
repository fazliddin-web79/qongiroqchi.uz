"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { History, Pencil, Search, Target } from "lucide-react";
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

type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "NOT_INTERESTED" | "SOLD" | "ARCHIVED";
type Lead = { id: string; source: string; status: LeadStatus; note: string | null; callbackAt: string | null; assignedToId: string | null; contact: { fullName: string; phone: string } | null; campaign: { id: string; name: string } | null; assignedTo: { id: string; name: string } | null; _count: { history: number } };
type HistoryItem = { id: string; action: string; fromStatus: LeadStatus | null; toStatus: LeadStatus | null; note: string | null; createdAt: string; user: { name: string } | null };
type User = { id: string; name: string; roles: { role: { name: string } }[] };
type PaginatedLeads = { items: Lead[]; pagination: { page: number; pages: number; total: number; limit: number } };
const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "SOLD", "ARCHIVED"];

export function LeadsPage({ operatorPanel = false }: { operatorPanel?: boolean }) {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [items, setItems] = useState<Lead[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [form, setForm] = useState({ status: "NEW" as LeadStatus, note: "", callbackAt: "", assignedToId: "" });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadOperators = useCallback(async () => {
    const query = new URLSearchParams({ limit: "100" }); if (companyId) query.set("companyId", companyId);
    try { const users = (await apiRequest<{ items: User[] }>(`/api/users?${query}`)).items; setOperators(users.filter((user) => user.roles.some(({ role }) => role.name === "OPERATOR"))); } catch { setOperators([]); }
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (companyId) query.set("companyId", companyId); if (search.trim()) query.set("search", search.trim()); if (status) query.set("status", status); if (operatorId) query.set("assignedToId", operatorId);
    try { const result = await apiRequest<PaginatedLeads>(`/api/leads?${query}`); setItems(result.items); setPagination(result.pagination); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [companyId, operatorId, page, search, status, t]);

  useEffect(() => { void loadOperators(); }, [loadOperators]);
  useEffect(() => { const timeout = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timeout); }, [load]);

  function openEdit(lead: Lead) { setEditing(lead); setForm({ status: lead.status, note: lead.note ?? "", callbackAt: lead.callbackAt ? new Date(lead.callbackAt).toISOString().slice(0, 16) : "", assignedToId: lead.assignedToId ?? "" }); setModalError(""); }
  async function save(event: FormEvent) { event.preventDefault(); if (!editing) return; setSaving(true); setModalError(""); try { await apiRequest(`/api/leads/${editing.id}`, jsonRequest("PATCH", { status: form.status, note: form.note || null, callbackAt: form.callbackAt ? new Date(form.callbackAt).toISOString() : null, ...(operators.length ? { assignedToId: form.assignedToId || null } : {}) })); setEditing(null); await load(); } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); } }
  async function showHistory(lead: Lead) { setModalError(""); try { setHistory(await apiRequest<HistoryItem[]>(`/api/leads/${lead.id}/history`)); } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } }

  return <><PageHeader title={t(operatorPanel ? "pages.operator.title" : "pages.leads.title")} description={t(operatorPanel ? "pages.operator.description" : "pages.leads.description")} /><Card className="mb-4"><CardContent className="flex flex-wrap gap-3 p-4"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("modules.leads.search")} /></label>{!operatorPanel && companies.length > 0 && <Select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setOperatorId(""); setPage(1); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>}{!operatorPanel && operators.length > 0 && <Select value={operatorId} onChange={(event) => { setOperatorId(event.target.value); setPage(1); }}><option value="">{t("modules.leads.allOperators")}</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}</Select>}<Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allStatuses")}</option>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.leads.status.${item}`)}</option>)}</Select></CardContent></Card>{loading ? <ModuleLoading label={t("modules.common.loading")} /> : error ? <ModuleError title={error} retry={() => void load()} retryLabel={t("modules.common.retry")} /> : items.length === 0 ? <EmptyState icon={Target} title={t(operatorPanel ? "pages.operator.emptyTitle" : "pages.leads.emptyTitle")} description={t(operatorPanel ? "pages.operator.emptyDescription" : "pages.leads.emptyDescription")} /> : <Card><Table><TableHeader><TableRow><TableHead>{t("modules.leads.fields.contact")}</TableHead><TableHead>{t("modules.leads.fields.campaign")}</TableHead><TableHead>{t("modules.leads.fields.source")}</TableHead><TableHead>{t("modules.leads.fields.status")}</TableHead><TableHead>{t("modules.leads.fields.operator")}</TableHead><TableHead>{t("modules.leads.fields.callbackAt")}</TableHead><TableHead className="text-right">{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{items.map((lead) => <TableRow key={lead.id}><TableCell><p className="font-medium">{lead.contact?.fullName ?? "-"}</p><p className="text-xs text-muted-foreground">{lead.contact?.phone ?? "-"}</p></TableCell><TableCell>{lead.campaign?.name ?? "-"}</TableCell><TableCell>{lead.source}</TableCell><TableCell><Badge variant={leadVariant(lead.status)}>{t(`modules.leads.status.${lead.status}`)}</Badge></TableCell><TableCell>{lead.assignedTo?.name ?? t("modules.leads.unassigned")}</TableCell><TableCell>{lead.callbackAt ? new Date(lead.callbackAt).toLocaleString() : "-"}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={t("modules.common.edit")} onClick={() => openEdit(lead)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={t("modules.leads.history")} onClick={() => void showHistory(lead)}><History className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table><CardContent><PaginationControls page={pagination.page} pages={pagination.pages} onPage={setPage} previousLabel={t("modules.common.previous")} nextLabel={t("modules.common.next")} /></CardContent></Card>}<Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t("modules.leads.updateTitle")} closeLabel={t("common.close")}><form className="space-y-4" onSubmit={save}><Field label={t("modules.leads.fields.status")}><Select className="w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatus })}>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.leads.status.${item}`)}</option>)}</Select></Field>{operators.length > 0 && <Field label={t("modules.leads.fields.operator")}><Select className="w-full" value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })}><option value="">{t("modules.leads.unassigned")}</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}</Select></Field>}<Field label={t("modules.leads.fields.callbackAt")}><Input type="datetime-local" value={form.callbackAt} onChange={(event) => setForm({ ...form, callbackAt: event.target.value })} /></Field><Field label={t("modules.leads.fields.note")}><Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>{modalError && <p className="text-sm text-destructive">{modalError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("modules.common.cancel")}</Button><Button disabled={saving}>{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div></form></Modal><Modal open={history !== null} onClose={() => setHistory(null)} title={t("modules.leads.history")} closeLabel={t("common.close")}><div className="max-h-96 space-y-3 overflow-auto">{history?.length ? history.map((item) => <div className="rounded-lg border p-3" key={item.id}><div className="flex justify-between gap-3"><p className="text-sm font-medium">{t(`modules.leads.actions.${item.action}`)}</p><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.user?.name ?? t("modules.leads.system")}{item.toStatus ? ` • ${t(`modules.leads.status.${item.toStatus}`)}` : ""}</p>{item.note && <p className="mt-2 text-sm">{item.note}</p>}</div>) : <p className="text-sm text-muted-foreground">{t("modules.leads.noHistory")}</p>}</div></Modal></>;
}

function leadVariant(status: LeadStatus): "default" | "secondary" | "success" | "warning" | "destructive" { if (["INTERESTED", "SOLD"].includes(status)) return "success"; if (status === "NOT_INTERESTED") return "destructive"; if (["NEW", "CONTACTED"].includes(status)) return "warning"; return "secondary"; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
