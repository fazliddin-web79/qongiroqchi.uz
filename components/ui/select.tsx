import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-10 rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring", className)} {...props} />
));
Select.displayName = "Select";
