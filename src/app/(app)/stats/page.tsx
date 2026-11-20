"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/store";
import { addMonths, money, moneyShort, monthKey, monthLabel, monthShort, monthStart } from "@/lib/format";
import { totals, txBetween, usageSlices } from "@/lib/finance";
import { UsageCard } from "@/components/UsageCard";
import { Bars, SplitBar } from "@/components/Charts";
import { ScopeSwitcher } from "@/components/Switchers";
import { Avatar, Card, Page, PageHeader, Segmented, SectionTitle } from "@/components/ui";

type Period = "month" | "quarter" | "year";

function periodRange(p: Period, offset: number) {
  const now = monthStart(new Date());
  if (p === "month") {
    const from = addMonths(now, offset);
    return { from, to: addMonths(from, 1), months: 1, label: monthLabel(from) };
  }
  if (p === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3 + offset * 3, 1);
    const n = Math.floor(from.getMonth() / 3) + 1;
    return { from, to: addMonths(from, 3), months: 3, label: `${n}${n === 1 ? "er" : "e"} trimestre ${from.getFullYear()}` };
  }
  const from = new Date(now.getFullYear() + offset, 0, 1);
  return { from, to: addMonths(from, 12), months: 12, label: `Année ${from.getFullYear()}` };
}

export default function StatsPage() {
  const d = useData();
  const { scope } = d;
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const r = periodRange(period, offset);
  const prevR = periodRange(period, offset - 1);

  const txs = useMemo(() => txBetween(d.transactions, r.from, r.to), [d.transactions, r.from, r.to]);
  const cur = totals(txs, scope);
  const prev = totals(txBetween(d.transactions, prevR.from, prevR.to), scope);
  const diff = cur.expense - prev.expense;

  // Évolution : 6 derniers mois pour un mois, sinon les mois de la période
  const months =
    period === "month"
      ? Array.from({ length: 6 }, (_, i) => addMonths(r.from, i - 5))
      : Array.from({ length: r.months }, (_, i) => addMonths(r.from, i));
  const evolution = months.map((m) => {
    const t = totals(txBetween(d.transactions, m, addMonths(m, 1)), scope);
    return { label: monthShort(m), values: [t.expense, t.income], highlight: period === "month" ? monthKey(m) === monthKey(r.from) : undefined };
  });

  // Répartition par personne (toujours sur l'ensemble du foyer)
  const people = [
    ...d.members.map((m) => ({
      id: m.user_id, name: m.profile?.first_name || "…", color: m.profile?.color ?? "#C5B6F2", profile: m.profile,
      expense: totals(txs, m.user_id).expense, income: totals(txs, m.user_id).income,
    })),
    {
      id: "common", name: "Commun", color: "#F4EFF8", profile: undefined,
      expense: txs.filter((t) => t.kind === "expense" && t.assigned_to === null).reduce((s, t) => s + t.amount_cents, 0),
      income: txs.filter((t) => t.kind === "income" && t.assigned_to === null).reduce((s, t) => s + t.amount_cents, 0),
    },
  ];

  // Épargne : versements cumulés par mois
  const contribs = d.savings_contributions.filter((c) => {
    const g = d.savings_goals.find((x) => x.id === c.goal_id);
    return g && (scope === "all" || g.owner_id === scope || g.owner_id === null);
  });
  let running = contribs.filter((c) => c.contributed_on < `${monthKey(months[0])}-01`).reduce((s, c) => s + c.amount_cents, 0);
  const savingsEvo = months.map((m) => {
    running += contribs.filter((c) => c.contributed_on.startsWith(monthKey(m))).reduce((s, c) => s + c.amount_cents, 0);
    return { label: monthShort(m), values: [Math.max(0, running)] };
  });

  return (
    <Page>
      <PageHeader title="Analyse" back="/depenses" />
      <ScopeSwitcher />
      <Segmented
        className="mt-3"
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setOffset(0);
        }}
        options={[
          { value: "month", label: "Mois" },
          { value: "quarter", label: "Trimestre" },
          { value: "year", label: "Année" },
        ]}
      />
      <div className="mt-4 flex items-center justify-between">
        <button aria-label="Période précédente" onClick={() => setOffset(offset - 1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface">
          <ChevronLeft size={20} />
        </button>
        <span className="font-num text-[17px] font-semibold text-ink">{r.label}</span>
        <button aria-label="Période suivante" onClick={() => setOffset(offset + 1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Synthèse */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[13px] text-muted">Dépenses</p>
          <p className="font-num tabular text-[22px] font-semibold text-ink">{money(cur.expense)}</p>
          <p className={`text-[12px] font-medium ${diff > 0 ? "text-over" : "text-ok"}`}>
            {prev.expense ? `${diff > 0 ? "+" : "−"}${moneyShort(Math.abs(diff))} vs période préc.` : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-[13px] text-muted">Revenus</p>
          <p className="font-num tabular text-[22px] font-semibold text-ink">{money(cur.income)}</p>
          <p className={`text-[12px] font-medium ${cur.net >= 0 ? "text-ok" : "text-over"}`}>
            Solde {cur.net >= 0 ? "+" : "−"}{moneyShort(Math.abs(cur.net))}
          </p>
        </Card>
      </div>

      {/* Par catégorie : même camembert que l'accueil */}
      <div className="mt-6">
        <UsageCard
          title="Utilisation"
          income={cur.income}
          usage={usageSlices({ monthTx: txs, scope, categories: d.categories, income: cur.income, saving: cur.saving, pendingCharges: 0 })}
        />
      </div>

      {/* Évolution */}
      <SectionTitle>Évolution mensuelle</SectionTitle>
      <Card>
        <div className="mb-3 flex gap-4 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-strong" /> Dépenses</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-peche" /> Revenus</span>
        </div>
        <Bars data={evolution} format={money} />
      </Card>

      {/* Qui dépense quoi */}
      {d.members.length > 1 && (
        <>
          <SectionTitle>{d.members.map((m) => m.profile?.first_name).join(" & ")}</SectionTitle>
          <Card>
            <p className="mb-2 text-[13px] text-muted">Dépenses par personne</p>
            <SplitBar parts={people.map((p) => ({ value: p.expense, color: p.color }))} />
            <div className="mt-3 space-y-2.5">
              {people.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.profile ? <Avatar profile={p.profile} size={30} /> : <span className="h-[30px] w-[30px] rounded-full" style={{ background: p.color }} />}
                  <span className="flex-1 text-[15px] font-medium text-ink">{p.name}</span>
                  <span className="text-right">
                    <span className="tabular block text-[15px] font-semibold text-ink">{money(p.expense)}</span>
                    {p.income > 0 && <span className="tabular block text-[12px] text-ok">+{money(p.income)} revenus</span>}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Épargne */}
      <SectionTitle>Épargne</SectionTitle>
      <Card>
        <p className="mb-3 text-[13px] text-muted">Total épargné dans vos objectifs</p>
        <Bars data={savingsEvo} colors={["#C5B6F2"]} height={110} format={money} />
      </Card>

      <p className="mt-6 px-2 text-center text-xs text-muted">
        Les virements entre comptes ne sont pas comptés dans les dépenses et revenus.
        {scope !== "all" && " Les dépenses communes apparaissent dans la vue Ensemble."}
      </p>
    </Page>
  );
}
