"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ContactRound, FolderPlus, Import, Pencil, Plus, Search, Trash2 } from "lucide-react";
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

type ContactStatus = "ACTIVE" | "BLOCKED" | "UNSUBSCRIBED";
type Contact = { id: string; fullName: string; phone: string; status: ContactStatus; groupId: string | null; extraFields: unknown; group: { id: string; name: string } | null; company?: { name: string } };
type Group = { id: string; name: string; description: string | null; _count: { contacts: number; campaigns: number } };
type PaginatedContacts = { items: Contact[]; pagination: { page: number; pages: number; total: number; limit: number } };
type ContactForm = { fullName: string; phone: string; groupId: string; status: ContactStatus; extraFields: string };

const EMPTY_FORM: ContactForm = { fullName: "", phone: "", groupId: "", status: "ACTIVE", extraFields: "{}" };
const STATUSES: ContactStatus[] = ["ACTIVE", "BLOCKED", "UNSUBSCRIBED"];

export function ContactsPage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contactModal, setContactModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadGroups = useCallback(async () => {
    const query = companyId ? `?companyId=${companyId}` : "";
    try { setGroups(await apiRequest<Group[]>(`/api/contact-groups${query}`)); } catch { /* The main request displays auth/database errors. */ }
  }, [companyId]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    if (groupId) query.set("groupId", groupId);
    if (companyId) query.set("companyId", companyId);
    try {
      const result = await apiRequest<PaginatedContacts>(`/api/contacts?${query}`);
      setContacts(result.items);
      setPagination(result.pagination);
    } catch (value) {
      setError(value instanceof Error ? value.message : t("modules.common.error"));
    } finally {
      setLoading(false);
    }
  }, [companyId, groupId, page, search, status, t]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => {
    const timeout = window.setTimeout(() => void loadContacts(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadContacts]);

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setModalError(""); setContactModal(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({ fullName: contact.fullName, phone: contact.phone, groupId: contact.groupId ?? "", status: contact.status, extraFields: JSON.stringify(contact.extraFields ?? {}, null, 2) });
    setModalError(""); setContactModal(true);
  }

  async function saveContact(event: FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      const extraFields = JSON.parse(form.extraFields || "{}") as Record<string, unknown>;
      await apiRequest(editing ? `/api/contacts/${editing.id}` : "/api/contacts", jsonRequest(editing ? "PATCH" : "POST", { ...form, companyId: companyId || undefined, groupId: form.groupId || null, extraFields }));
      setContactModal(false); setNotice(t(editing ? "modules.contacts.updated" : "modules.contacts.created")); await loadContacts();
    } catch (value) {
      setModalError(value instanceof Error ? value.message : t("modules.common.error"));
    } finally { setSaving(false); }
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(t("modules.contacts.deleteConfirm"))) return;
    try { await apiRequest(`/api/contacts/${contact.id}`, jsonRequest("DELETE")); setNotice(t("modules.contacts.deleted")); await loadContacts(); } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); }
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      await apiRequest("/api/contact-groups", jsonRequest("POST", { ...groupForm, companyId: companyId || undefined }));
      setGroupForm({ name: "", description: "" }); setNotice(t("modules.contacts.groupCreated")); await loadGroups();
    } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  async function deleteGroup(group: Group) {
    if (!window.confirm(t("modules.contacts.groupDeleteConfirm"))) return;
    try { await apiRequest(`/api/contact-groups/${group.id}`, jsonRequest("DELETE")); await loadGroups(); await loadContacts(); } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); }
  }

  async function importContacts(event: FormEvent) {
    event.preventDefault(); if (!file) return; setSaving(true); setModalError("");
    const data = new FormData(); data.set("file", file); if (groupId) data.set("groupId", groupId); if (companyId) data.set("companyId", companyId);
    try {
      const result = await apiRequest<{ created: number; skipped: number }>("/api/contacts/import", { method: "POST", body: data });
      setImportModal(false); setFile(null); setNotice(`${t("modules.contacts.imported")}: ${result.created}, ${t("modules.contacts.skipped")}: ${result.skipped}`); await loadContacts();
    } catch (value) { setModalError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setSaving(false); }
  }

  return <>
    <PageHeader title={t("pages.contacts.title")} description={t("pages.contacts.description")} action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setModalError(""); setGroupModal(true); }}><FolderPlus className="size-4" />{t("modules.contacts.groups")}</Button><Button variant="outline" onClick={() => { setModalError(""); setImportModal(true); }}><Import className="size-4" />{t("modules.contacts.import")}</Button><Button onClick={openCreate}><Plus className="size-4" />{t("pages.contacts.action")}</Button></div>} />
    {notice && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
    <Card className="mb-4"><CardContent className="flex flex-wrap gap-3 p-4"><label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("modules.contacts.search")} /></label>{companies.length > 0 && <Select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setGroupId(""); setPage(1); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>}<Select value={groupId} onChange={(event) => { setGroupId(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allGroups")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select><Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t("modules.contacts.allStatuses")}</option>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.contacts.status.${item}`)}</option>)}</Select></CardContent></Card>
    {loading ? <ModuleLoading label={t("modules.common.loading")} /> : error ? <ModuleError title={error} retry={() => void loadContacts()} retryLabel={t("modules.common.retry")} /> : contacts.length === 0 ? <EmptyState icon={ContactRound} title={t("pages.contacts.emptyTitle")} description={t("pages.contacts.emptyDescription")} action={t("pages.contacts.action")} /> : <Card><Table><TableHeader><TableRow><TableHead>{t("modules.contacts.fields.fullName")}</TableHead><TableHead>{t("modules.contacts.fields.phone")}</TableHead><TableHead>{t("modules.contacts.fields.group")}</TableHead><TableHead>{t("modules.contacts.fields.status")}</TableHead><TableHead className="text-right">{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{contacts.map((contact) => <TableRow key={contact.id}><TableCell className="font-medium">{contact.fullName}</TableCell><TableCell>{contact.phone}</TableCell><TableCell>{contact.group?.name ?? t("modules.contacts.noGroup")}</TableCell><TableCell><Badge variant={contact.status === "ACTIVE" ? "success" : contact.status === "BLOCKED" ? "destructive" : "warning"}>{t(`modules.contacts.status.${contact.status}`)}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={t("modules.common.edit")} onClick={() => openEdit(contact)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={t("modules.common.delete")} onClick={() => void deleteContact(contact)}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell></TableRow>)}</TableBody></Table><CardContent><PaginationControls page={pagination.page} pages={pagination.pages} onPage={setPage} previousLabel={t("modules.common.previous")} nextLabel={t("modules.common.next")} /></CardContent></Card>}

    <Modal open={contactModal} onClose={() => setContactModal(false)} title={t(editing ? "modules.contacts.editTitle" : "modules.contacts.createTitle")} closeLabel={t("common.close")}><form className="space-y-4" onSubmit={saveContact}><Field label={t("modules.contacts.fields.fullName")}><Input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field><Field label={t("modules.contacts.fields.phone")}><Input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+998901234567" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t("modules.contacts.fields.group")}><Select className="w-full" value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}><option value="">{t("modules.contacts.noGroup")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select></Field><Field label={t("modules.contacts.fields.status")}><Select className="w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ContactStatus })}>{STATUSES.map((item) => <option key={item} value={item}>{t(`modules.contacts.status.${item}`)}</option>)}</Select></Field></div><Field label={t("modules.contacts.fields.extraFields")}><Textarea value={form.extraFields} onChange={(event) => setForm({ ...form, extraFields: event.target.value })} /></Field><FormFooter error={modalError} saving={saving} cancel={() => setContactModal(false)} t={t} /></form></Modal>
    <Modal open={groupModal} onClose={() => setGroupModal(false)} title={t("modules.contacts.groupsTitle")} closeLabel={t("common.close")}><form className="space-y-3" onSubmit={saveGroup}><Field label={t("modules.contacts.fields.groupName")}><Input required value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} /></Field><Field label={t("modules.contacts.fields.description")}><Textarea value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} /></Field><FormFooter error={modalError} saving={saving} cancel={() => setGroupModal(false)} t={t} /></form><div className="mt-5 max-h-48 space-y-2 overflow-auto">{groups.map((group) => <div key={group.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div><p className="text-sm font-medium">{group.name}</p><p className="text-xs text-muted-foreground">{group._count.contacts} {t("modules.contacts.contactsCount")}</p></div><Button type="button" variant="ghost" size="icon" aria-label={t("modules.common.delete")} onClick={() => void deleteGroup(group)}><Trash2 className="size-4 text-destructive" /></Button></div>)}</div></Modal>
    <Modal open={importModal} onClose={() => setImportModal(false)} title={t("modules.contacts.importTitle")} closeLabel={t("common.close")}><form className="space-y-4" onSubmit={importContacts}><p className="text-sm text-muted-foreground">{t("modules.contacts.importHint")}</p><Input required type="file" accept=".csv,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FormFooter error={modalError} saving={saving} cancel={() => setImportModal(false)} t={t} /></form></Modal>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function FormFooter({ error, saving, cancel, t }: { error: string; saving: boolean; cancel: () => void; t: (key: string) => string }) { return <>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={cancel}>{t("modules.common.cancel")}</Button><Button disabled={saving}>{saving ? t("modules.common.saving") : t("modules.common.save")}</Button></div></>; }
