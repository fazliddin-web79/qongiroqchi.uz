import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
      <span className="mb-4 rounded-full bg-primary/10 p-3 text-primary"><Icon className="size-6" /></span>
      <h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <Button className="mt-5">{action}</Button>}
    </div>
  );
}
