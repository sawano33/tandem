"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, ReceiptText, ChartPie, CircleUserRound } from "lucide-react";
import { useData } from "@/lib/store";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Accueil", icon: House, match: (p: string) => p === "/" },
  { href: "/depenses", label: "Dépenses", icon: ReceiptText, match: (p: string) => p.startsWith("/depenses") || p.startsWith("/stats") },
  null,
  { href: "/budgets", label: "Budgets", icon: ChartPie, match: (p: string) => p.startsWith("/budgets") },
  { href: "/profil", label: "Profil", icon: CircleUserRound, match: (p: string) => p.startsWith("/profil") },
];

export function TabBar() {
  const path = usePathname();
  const { openSheet } = useData();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-end justify-between px-2 pt-1.5">
        {TABS.map((t, i) =>
          t ? (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cx(
                  "press flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium",
                  t.match(path) ? "text-ink" : "text-muted",
                )}
              >
                <t.icon size={24} strokeWidth={t.match(path) ? 2.2 : 1.8} />
                {t.label}
              </Link>
            </li>
          ) : (
            <li key={i} className="flex flex-1 justify-center">
              <button
                onClick={() => openSheet({ kind: "expense" })}
                aria-label="Ajouter une opération"
                className="press -mt-5 flex h-15 w-15 items-center justify-center rounded-full bg-grad-cta text-aubergine shadow-[0_8px_20px_-8px_rgba(37,29,64,0.45)] ring-4 ring-bg"
              >
                <Plus size={30} strokeWidth={2.4} />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
