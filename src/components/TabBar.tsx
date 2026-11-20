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

/** Barre flottante : pilule givrée, indicateur qui glisse sous l'onglet actif, bouton + central en relief. */
export function TabBar() {
  const path = usePathname();
  const { openSheet, sheet } = useData();
  const active = TABS.findIndex((t) => t?.match(path));

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}>
      <div className="tabbar pointer-events-auto relative mx-auto flex h-[68px] max-w-md items-center rounded-[26px] border border-white/8 px-1.5">
        {/* indicateur glissant */}
        {active >= 0 && (
          <span
            aria-hidden
            className="tab-indicator absolute top-1.5 bottom-1.5 left-1.5 rounded-[20px]"
            style={{ width: "calc((100% - 12px) / 5)", transform: `translateX(${active * 100}%)` }}
          />
        )}
        {TABS.map((t, i) =>
          t ? (
            <Link
              key={t.href}
              href={t.href}
              aria-current={i === active ? "page" : undefined}
              className={cx(
                "relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-wide transition-colors duration-300",
                i === active ? "text-ink" : "text-muted/80",
              )}
            >
              <t.icon size={22} strokeWidth={i === active ? 2.3 : 1.8} className={cx("transition-transform duration-300", i === active && "tab-pop text-lavande")} />
              <span>{t.label}</span>
            </Link>
          ) : (
            <div key="add" className="relative z-10 flex flex-1 justify-center">
              <button
                onClick={() => openSheet({ kind: "expense" })}
                aria-label="Ajouter une opération"
                className="add-btn press bg-grad-cta -mt-7 flex h-[60px] w-[60px] items-center justify-center rounded-[22px] text-aubergine"
              >
                <Plus size={28} strokeWidth={2.6} className={cx("transition-transform duration-300", sheet.open && "rotate-45")} />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
