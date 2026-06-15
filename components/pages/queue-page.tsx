"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CircleCheck, CircleX, Clock3, ListRestart, RefreshCcw, RotateCcw, Server } from "lucide-react";
import { useCompanyScope } from "@/hooks/use-company-scope";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type JobState = "waiting" | "active" | "delayed" | "completed" | "failed";
type QueueJob = {
  id: string;
  campaignName: string;
  phone: string;
  state: JobState;
  attemptsMade: number;
  maxAttempts: number;
  failedReason: string | null;
  timestamp: number;
};
type QueueSnapshot = {
  status: string;
  workers: number;
  counts: Record<JobState, number>;
  jobs: QueueJob[];
};

export function QueuePage() {
  const { t } = useTranslations();
  const { companies, companyId, setCompanyId } = useCompanyScope();
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState("");

  const loadQueue = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    const query = companyId ? `?companyId=${companyId}` : "";
    try {
      setSnapshot(await apiRequest<QueueSnapshot>(`/api/queue/stats${query}`));
    } catch (value) {
      setError(value instanceof Error ? value.message : t("modules.common.error"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void loadQueue();
    const interval = window.setInterval(() => void loadQueue(true), 5_000);
    return () => window.clearInterval(interval);
  }, [loadQueue]);

  async function retryJob(jobId: string) {
    setRetrying(jobId);
    try {
      await apiRequest(`/api/queue/jobs/${jobId}/retry`, jsonRequest("POST"));
      await loadQueue(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : t("modules.common.error"));
    } finally {
      setRetrying("");
    }
  }

  return <>
    <PageHeader
      title={t("pages.queue.title")}
      description={t("pages.queue.description")}
      action={<Button variant="outline" onClick={() => void loadQueue()}><RefreshCcw className="size-4" />{t("modules.queue.refresh")}</Button>}
    />
    {companies.length > 0 && <Card className="mb-4"><CardContent className="flex justify-end p-4"><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></CardContent></Card>}
    {loading ? <ModuleLoading label={t("modules.common.loading")} /> : error && !snapshot ? <ModuleError title={error} retry={() => void loadQueue()} retryLabel={t("modules.common.retry")} /> : snapshot && <>
      {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <QueueStat icon={Server} label={t("modules.queue.status")} value={t("modules.queue.connected")} />
        <QueueStat icon={Activity} label={t("modules.queue.workers")} value={snapshot.workers} />
        <QueueStat icon={ListRestart} label={t("modules.queue.waiting")} value={snapshot.counts.waiting} />
        <QueueStat icon={Clock3} label={t("modules.queue.running")} value={snapshot.counts.active} />
        <QueueStat icon={CircleCheck} label={t("modules.queue.completed")} value={snapshot.counts.completed} />
        <QueueStat icon={CircleX} label={t("modules.queue.failed")} value={snapshot.counts.failed} />
      </div>
      <Card>
        <CardContent className="border-b p-4"><h2 className="font-semibold">{t("modules.queue.jobs")}</h2><p className="text-sm text-muted-foreground">{t("modules.queue.autoRefresh")}</p></CardContent>
        <Table><TableHeader><TableRow><TableHead>{t("modules.queue.fields.campaign")}</TableHead><TableHead>{t("modules.queue.fields.phone")}</TableHead><TableHead>{t("modules.queue.fields.state")}</TableHead><TableHead>{t("modules.queue.fields.attempts")}</TableHead><TableHead>{t("modules.queue.fields.createdAt")}</TableHead><TableHead>{t("modules.queue.fields.error")}</TableHead><TableHead className="text-right">{t("modules.common.actions")}</TableHead></TableRow></TableHeader>
          <TableBody>{snapshot.jobs.length ? snapshot.jobs.map((job) => <TableRow key={job.id}><TableCell className="font-medium">{job.campaignName}</TableCell><TableCell>{job.phone}</TableCell><TableCell><Badge variant={stateVariant(job.state)}>{t(`modules.queue.states.${job.state}`)}</Badge></TableCell><TableCell>{job.attemptsMade} / {job.maxAttempts}</TableCell><TableCell>{new Date(job.timestamp).toLocaleString()}</TableCell><TableCell className="max-w-64 truncate text-muted-foreground">{job.failedReason ?? "-"}</TableCell><TableCell><div className="flex justify-end">{job.state === "failed" && <Button size="sm" variant="outline" disabled={retrying === job.id} onClick={() => void retryJob(job.id)}><RotateCcw className="size-4" />{t("modules.queue.retry")}</Button>}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t("modules.queue.empty")}</TableCell></TableRow>}</TableBody>
        </Table>
      </Card>
    </>}
  </>;
}

function QueueStat({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><Icon className="size-5 text-primary" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>;
}

function stateVariant(state: JobState): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (state === "completed") return "success";
  if (state === "failed") return "destructive";
  if (state === "active" || state === "delayed") return "warning";
  return "secondary";
}
