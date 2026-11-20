"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChartColumn, ChevronRight, Search, X, ReceiptText } from "lucide-react";
import { useData } from "@/lib/store";
import { addMonths, dayLabel, money } from "@/lib/format";
import { byCategory, inScope, totals, txOfMonth } from "@/lib/finance";
import { IconBubble } from "@/lib/icons";
import { MonthSwitcher, ScopeSwitcher } from "@/components/Switchers";
import { TxRow } from "@/components/TxRow";
import { Card, Chip, EmptyState, Page, PageHeader, cx } from "@/components/ui";
import type { TxKind } from "@/lib/types";

export default function DepensesPage() {
  const d = useData();
  const { scope, month } = d;
  const [kind, setKind] = useState<"all" | TxKind>("all");
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showCats, setShowCats] = useState(true);

  const monthTx = useMemo(() => txOfMonth(d.transactions, month), [d.transactions, month]);
  const { expense } = totals(monthTx, scope);
  const prev = totals(txOfMonth(d.transactions, addMonths(month, -1)), scope).expense;
  const delta = prev ? Math.round(((expense - prev) / prev) * 100) : null;
  const cats = byCategory(monthTx, scope, d.categories);

  const list = monthTx.filter(
    (t) =>
      (t.kind === "transfer" ? scope === "all" : inScope(t.assigned_to, scope)) &&
      (kind === "all" || t.kind === kind) &&
      (!cat || (t.category_id ?? "none") === cat) &&
      (!q || t.label.toLowerCase().includes(q.toLowerCase())),
  );
  const groups = list.reduce<Record<string, typeof list>>((g, t) => {
    (g[t.occurred_on] ??= []).push(t);
    return g;
  }, {});

  return (
    <Page>
      <PageHeader
        title="Dépenses"
        right={
          <Link href="/stats" aria-label="Statistiques" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
            <ChartColumn size={20} />
          </Link>
        }
      />
      <ScopeSwitcher />
      <MonthSwitcher className="mt-4" />

      <Card className="mt-4">
        <p className="font-display tabular text-[34px] font-semibold leading-tight text-ink">{money(expense)}</p>
        <p className="text-[13px] text-muted">
          {delta === null ? "dépensés ce mois-ci" : `${delta > 0 ? "+" : ""}${delta} % par rapport au mois précédent`}
        </p>

        {cats.length > 0 && (
          <>
            <button onClick={() => setShowCats((v) => !v)} className="mt-3 text-[13px] font-medium text-muted">
              {showCats ? "Masquer les catégories" : "Voir par catégorie"}
            </button>
            {showCats && (
              <div className="mt-1 divide-y divide-line">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(cat === c.id ? null : c.id)}
                    className={cx("press flex w-full items-center gap-3 py-2.5 text-left", cat && cat !== c.id && "opacity-40")}
                  >
                    <IconBubble name={c.icon} color={c.color} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{c.name}</span>
                      <span className="text-[12px] text-muted">{Math.round(c.share * 100)} %</span>
                    </span>
                    <span className="tabular text-[15px] font-semibold text-ink">{money(c.cents)}</span>
                    <ChevronRight size={16} className="text-muted" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Filtres */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-surface px-3">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une opération"
          className="h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted/70"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Effacer">
            <X size={18} className="text-muted" />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["all", "Toutes"],
            ["expense", "Dépenses"],
            ["income", "Revenus"],
            ["transfer", "Virements"],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} active={kind === v} onClick={() => setKind(v)}>
            {l}
          </Chip>
        ))}
        {cat && (
          <Chip active onClick={() => setCat(null)}>
            {cats.find((c) => c.id === cat)?.name} <X size={14} />
          </Chip>
        )}
      </div>

      {/* Liste par jour */}
      {list.length === 0 ? (
        <EmptyState icon={<ReceiptText size={24} />} title="Rien pour l'instant" text="Aucune opération ne correspond à ces filtres." />
      ) : (
        Object.entries(groups).map(([day, txs]) => (
          <section key={day} className="mt-5">
            <div className="mb-1.5 flex justify-between px-1 text-[13px] font-medium text-muted">
              <span>{dayLabel(day)}</span>
              <span className="tabular">
                {money(txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount_cents, 0))}
              </span>
            </div>
            <Card className="py-1">
              {txs.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </Card>
          </section>
        ))
      )}
    </Page>
  );
}
