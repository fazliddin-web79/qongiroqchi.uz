"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Modal({ open, onClose, title, closeLabel, children }: { open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><Button variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}><X className="size-4" /></Button></div>
        {children}
      </div>
    </div>
  );
}
