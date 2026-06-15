import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><PublicHeader /><div className="flex-1">{children}</div><PublicFooter /></div>;
}
