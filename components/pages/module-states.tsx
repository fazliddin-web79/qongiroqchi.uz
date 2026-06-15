"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ModuleLoading({ label }: { label: string }) {
  return <Card><CardContent className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin text-primary" />{label}</CardContent></Card>;
}

export function ModuleError({ title, retry, retryLabel }: { title: string; retry: () => void; retryLabel: string }) {
  return <Card className="border-destructive/30"><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><AlertCircle className="mb-3 size-7 text-destructive" /><p className="max-w-lg text-sm text-muted-foreground">{title}</p><Button className="mt-4" variant="outline" onClick={retry}>{retryLabel}</Button></CardContent></Card>;
}

export function PaginationControls({ page, pages, previousLabel, nextLabel, onPage }: { page: number; pages: number; previousLabel: string; nextLabel: string; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <div className="mt-4 flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{previousLabel}</Button><span className="px-2 text-sm text-muted-foreground">{page} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{nextLabel}</Button></div>;
}
