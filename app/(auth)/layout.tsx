import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen lg:grid-cols-2"><aside className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col"><Logo /><div className="mt-auto grid grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((item) => <span className="h-20 rounded-xl bg-primary-foreground/10" key={item} />)}</div></aside><main className="relative grid place-items-center p-6"><div className="absolute right-4 top-4 flex"><LanguageSwitcher /><ThemeSwitcher /></div><div className="absolute left-4 top-4 lg:hidden"><Logo compact /></div><div className="w-full max-w-md rounded-xl border bg-card p-7 shadow-soft">{children}</div></main></div>;
}
