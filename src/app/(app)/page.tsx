"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Bell, CalendarClock, Info, PiggyBank, Plus, TriangleAlert, Wallet } from "lucide-react";
import { useData } from "@/lib/store";
import { daysInMonth, money, monthName, pct, relativeDue } from "@/lib/format";
import {
  budgetLines, cumulativeDaily, goalInScope, goalSaved, homeSummary, inScope, txOfMonth, upcomingCharges,
} from "@/lib/finance";
import { IconBubble } from "@/lib/icons";
import { LogoLoop } from "@/components/Logo";
import { MonthSwitcher, ScopeSwitcher } from "@/components/Switchers";
import { TxRow } from "@/components/TxRow";
import { Area } from "@/components/Charts";
import { Avatar, Card, EmptyState, Page, Progress, SectionTitle } from "@/components/ui";

export default function HomePage() {
  const d = useData();
  const { scope, month } = d;
  const [explain, setExplain] = useState(false);
  const router = useRouter();

  const s = useMemo(
    () =>
      homeSummary({
        accounts: d.accounts, transactions: d.transactions, recurring: d.recurring_expenses,
        scheduled: d.scheduled_transactions, month, scope,
      }),
    [d.accounts, d.transactions, d.recurring_expenses, d.scheduled_transactions, month, scope],
  );

  const alerts = budgetLines(d.budgets, d.categories, d.transactions, month).filter((l) => l.level !== "ok");
  const charges = s.isCurrent
    ? upcomingCharges(d.recurring_expenses, d.scheduled_transactions, scope)
    : s.occ.filter((o) => o.status === "pending").slice(0, 4);
  const recent = txOfMonth(d.transactions, month)
    .filter((t) => t.kind === "transfer" || inScope(t.assigned_to, scope))
    .slice(0, 5);
  const curve = cumulativeDaily(d.transactions, month, scope);
  const goals = d.savings_goals.filter((g) => !g.archived && goalInScope(g, scope));
  const saved = goals.reduce((acc, g) => acc + goalSaved(g, d.savings_contributions), 0);
  const target = goals.reduce((acc, g) => acc + g.target_cents, 0);

  const title = d.members.length > 1 ? d.members.map((m) => m.profile?.first_name).filter(Boolean).join(" & ") : d.household?.name;
  const heroLabel = s.isCurrent ? "Reste à vivre" : s.isPast ? "Bilan du mois" : "Charges prévues";
  const lastDay = `${daysInMonth(month)} ${monthName(month)}`;

  return (
    <Page>
      <header className="flex items-center gap-3 pt-2">
        <LogoLoop />
        <h1 className="font-display min-w-0 flex-1 truncate text-[21px] font-semibold text-ink">{title}</h1>
        <Link href="/budgets" aria-label="Alertes budgets" className="press relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
          <Bell size={20} />
          {alerts.length > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-peche ring-2 ring-surface" />}
        </Link>
        <Link href="/profil" aria-label="Profil">
          <Avatar profile={d.me} size={40} />
        </Link>
      </header>

      <ScopeSwitcher className="mt-5" />
      <MonthSwitcher className="mt-4" />

      {/* Reste à vivre */}
      <section className="animate-rise relative mt-4 overflow-hidden rounded-[26px] bg-grad-hero p-5 text-aubergine">
        <svg viewBox="0 0 200 140" className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-56" aria-hidden>
          <path d="M40 160 C40 90 90 50 150 50 C185 50 210 70 210 70 L210 160Z" fill="#251D40" />
          <path d="M120 160 C120 95 150 30 205 25" fill="none" stroke="#C5B6F2" strokeWidth="26" strokeLinecap="round" />
        </svg>
        <button onClick={() => setExplain((v) => !v)} className="relative flex items-center gap-1.5 text-[17px] font-semibold">
          <span className="font-display">{heroLabel}</span>
          <Info size={16} className="opacity-70" />
        </button>
        <p className="font-display tabular relative mt-1 text-[42px] font-semibold leading-none">{money(s.resteAVivre)}</p>
        <p className="relative mt-2 max-w-[60%] text-[13px] opacity-80">
          {s.isCurrent ? `jusqu'au ${lastDay}` : s.isPast ? "revenus − dépenses" : `à prélever en ${monthName(month)}`}
        </p>
        {explain && (
          <p className="animate-fade relative mt-3 max-w-[70%] rounded-2xl bg-white/50 p-3 text-[12.5px] leading-snug">
            {s.isCurrent
              ? `Solde disponible (${money(s.available)}) moins les charges fixes encore à prélever ce mois-ci (${money(s.pendingCharges)}).`
              : s.isPast
                ? "Pour un mois passé : total des revenus moins total des dépenses."
                : "Pour un mois à venir : somme des charges fixes prévues."}
          </p>
        )}
      </section>

      {/* Indicateurs */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="animate-rise">
          <Wallet size={20} className="text-muted" />
          <p className="mt-2 text-[13px] text-muted">Solde disponible</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.available)}</p>
        </Card>
        <Card className="animate-rise" onClick={() => router.push("/budgets?vue=epargne")}>
          <PiggyBank size={20} className="text-muted" />
          <p className="mt-2 text-[13px] text-muted">Épargne</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.savingsBalance)}</p>
        </Card>
        <Card className="animate-rise">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ok/15 text-ok">
            <ArrowDownLeft size={16} />
          </span>
          <p className="mt-2 text-[13px] text-muted">Revenus</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.income)}</p>
        </Card>
        <Card className="animate-rise" onClick={() => router.push("/stats")}>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-peche/30 text-[#D9705A]">
            <ArrowUpRight size={16} />
          </span>
          <p className="mt-2 text-[13px] text-muted">Dépenses</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.expense)}</p>
        </Card>
      </div>

      {/* Alertes budgets */}
      {alerts.length > 0 && (
        <Link href="/budgets" className="press mt-3 flex items-center gap-3 rounded-[22px] bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
            <TriangleAlert size={20} />
          </span>
          <span className="min-w-0 flex-1 text-sm text-ink">
            {alerts
              .slice(0, 2)
              .map((a) => `${a.category?.name} ${Math.round(a.ratio * 100)} %`)
              .join(" · ")}
            <span className="block text-[13px] text-muted">
              {alerts.some((a) => a.level === "over") ? "Budget dépassé" : "Budget bientôt atteint"}
            </span>
          </span>
        </Link>
      )}

      {/* Prochaines charges */}
      <SectionTitle href="/profil/charges" action="Gérer">Prochaines charges</SectionTitle>
      <Card className="py-2">
        {charges.length === 0 ? (
          <div className="flex items-center gap-3 py-3 text-sm text-muted">
            <CalendarClock size={20} />
            {d.recurring_expenses.length ? "Toutes les charges sont réglées." : "Ajoutez vos charges fixes (loyer, électricité…)."}
          </div>
        ) : (
          charges.map((o) => {
            const cat = d.categories.find((c) => c.id === o.recurring.category_id);
            const late = o.due_on < new Date().toISOString().slice(0, 10);
            return (
              <button
                key={o.recurring.id + o.due_on}
                onClick={() =>
                  d.openSheet({
                    kind: "expense",
                    charge: { recurring_id: o.recurring.id, due_on: o.due_on },
                    preset: {
                      amount_cents: o.amount_cents, label: o.recurring.label, category_id: o.recurring.category_id,
                      account_id: o.recurring.account_id ?? undefined, assigned_to: o.recurring.assigned_to, occurred_on: o.due_on,
                    },
                  })
                }
                className="press flex w-full items-center gap-3 py-2.5 text-left"
              >
                <IconBubble name={cat?.icon ?? "repeat"} color={cat?.color ?? "#9C8FE0"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{o.recurring.label}</span>
                  <span className={`block text-[13px] ${late ? "text-over" : "text-muted"}`}>{relativeDue(o.due_on)}</span>
                </span>
                <span className="tabular text-[15px] font-semibold text-ink">{money(o.amount_cents)}</span>
              </button>
            );
          })
        )}
      </Card>

      {/* Mon mois */}
      <SectionTitle href="/stats" action="Analyse">Mon mois</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] text-muted">Dépenses cumulées</p>
          <p className="tabular text-sm font-semibold text-ink">{money(s.expense)}</p>
        </div>
        <div className="mt-3">
          <Area points={curve} />
        </div>
      </Card>

      {/* Dernières transactions */}
      <SectionTitle href="/depenses">Dernières opérations</SectionTitle>
      <Card className="py-1.5">
        {recent.length === 0 ? (
          <EmptyState
            icon={<Plus size={24} />}
            title="Aucune opération"
            text="Ajoutez votre première dépense avec le bouton +."
          />
        ) : (
          recent.map((t) => <TxRow key={t.id} tx={t} />)
        )}
      </Card>

      {/* Épargne */}
      <SectionTitle href="/budgets?vue=epargne">Épargne & projets</SectionTitle>
      <Card>
        {goals.length === 0 ? (
          <Link href="/budgets?vue=epargne" className="flex items-center gap-3 text-sm text-muted">
            <PiggyBank size={20} /> Créez un objectif : vacances, arrivée du bébé…
          </Link>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="font-display tabular text-[22px] font-semibold text-ink">{money(saved)}</p>
              <p className="text-sm text-muted">sur {money(target)}</p>
            </div>
            <Progress ratio={target ? saved / target : 0} className="mt-2" />
            <div className="mt-3 space-y-2.5">
              {goals.slice(0, 3).map((g) => {
                const sv = goalSaved(g, d.savings_contributions);
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <IconBubble name={g.icon} color={g.color} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between text-sm">
                        <span className="truncate font-medium text-ink">{g.name}</span>
                        <span className="tabular text-muted">{pct(sv, g.target_cents)} %</span>
                      </span>
                      <Progress ratio={sv / g.target_cents} color={g.color} className="mt-1 h-1.5" />
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
