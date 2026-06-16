"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { useTranslations } from "@/components/providers/i18n-provider";
import { ModuleError, ModuleLoading } from "@/components/pages/module-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type Audio = { id: string; originalName: string; url: string; sizeBytes: number; durationSeconds: number | null; company: { name: string } };
type Campaign = { id: string; name: string; company: { name: string }; audioAsset: { status: string } | null; contactGroup: { _count: { contacts: number } } };

export function ModerationPage() {
  const { t } = useTranslations();
  const [audio, setAudio] = useState<Audio[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [audioData, campaignData] = await Promise.all([
        apiRequest<{ items: Audio[] }>("/api/audio-assets?status=PENDING_REVIEW&limit=100"),
        apiRequest<{ items: Campaign[] }>("/api/campaigns?status=PENDING_REVIEW&limit=100"),
      ]);
      setAudio(audioData.items); setCampaigns(campaignData.items);
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); } finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function review(kind: "audio" | "campaign", id: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    const reason = decision === "APPROVED" ? null : window.prompt(t("moderation.reasonPrompt"));
    if (decision !== "APPROVED" && !reason) return;
    try {
      await apiRequest(kind === "audio" ? `/api/audio-assets/${id}/review` : `/api/campaigns/${id}/review`, jsonRequest("POST", { decision, reason }));
      await load();
    } catch (value) { setError(value instanceof Error ? value.message : t("modules.common.error")); }
  }

  if (loading) return <ModuleLoading label={t("modules.common.loading")} />;
  if (error) return <ModuleError title={error} retry={() => void load()} retryLabel={t("modules.common.retry")} />;
  return <><PageHeader title={t("moderation.title")} description={t("moderation.description")} /><div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("moderation.audio")}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("moderation.company")}</TableHead><TableHead>{t("moderation.asset")}</TableHead><TableHead>{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{audio.map((item) => <TableRow key={item.id}><TableCell>{item.company.name}</TableCell><TableCell><a className="text-primary underline" href={item.url} target="_blank">{item.originalName}</a><p className="text-xs text-muted-foreground">{Math.round(item.sizeBytes / 1024)} KB</p></TableCell><TableCell><Actions approve={() => void review("audio", item.id, "APPROVED")} reject={() => void review("audio", item.id, "REJECTED")} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>{t("moderation.campaigns")}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("moderation.company")}</TableHead><TableHead>{t("moderation.campaign")}</TableHead><TableHead>{t("modules.common.actions")}</TableHead></TableRow></TableHeader><TableBody>{campaigns.map((item) => <TableRow key={item.id}><TableCell>{item.company.name}</TableCell><TableCell>{item.name}<p className="text-xs text-muted-foreground">{t("moderation.recipients")}: {item.contactGroup._count.contacts}</p><Badge variant={item.audioAsset?.status === "APPROVED" ? "success" : "warning"}>{item.audioAsset?.status ?? "NO_AUDIO"}</Badge></TableCell><TableCell><Actions approve={() => void review("campaign", item.id, "APPROVED")} reject={() => void review("campaign", item.id, "REJECTED")} changes={() => void review("campaign", item.id, "CHANGES_REQUESTED")} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></>;
}

function Actions({ approve, reject, changes }: { approve: () => void; reject: () => void; changes?: () => void }) {
  return <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={approve}><Check className="size-4 text-emerald-500" /></Button>{changes && <Button size="icon" variant="ghost" onClick={changes}><RotateCcw className="size-4 text-amber-500" /></Button>}<Button size="icon" variant="ghost" onClick={reject}><X className="size-4 text-destructive" /></Button></div>;
}
