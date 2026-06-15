import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";

export function StatCard({ icon: Icon, label, value, change }: { icon: LucideIcon; label: string; value: string; change: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-5" /></span><span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{change}</span></div><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>;
}
