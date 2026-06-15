import { Badge } from "./badge";

export function StatusBadge({ status, label }: { status: "active" | "pending" | "error"; label: string }) {
  const variants = { active: "success", pending: "warning", error: "destructive" } as const;
  return <Badge variant={variants[status]}>{label}</Badge>;
}
