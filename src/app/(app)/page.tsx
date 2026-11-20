"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Bell, CalendarClock, ChevronRight, Info, Landmark, TriangleAlert, Wallet } from "lucide-react";
import { useData } from "@/lib/store";
import { daysInMonth, money, moneyShort, monthName, pct, relativeDue, today } from "@/lib/format";
import {
  accountProjection, budgetLines, byCategory, goalInScope, goalSaved, homeSummary, txOfMonth, upcomingCharges,
} from "@/lib/finance";
import { IconBubble } from "@/lib/icons";
import { LogoLoop } from "@/components/Logo";
import { MonthSwitcher, ScopeSwitcher } from "@/components/Switchers";
import { Donut, SplitBar } from "@/components/Charts";
import { Avatar, Card, Page, Progress, SectionTitle, cx } from "@/components/ui";

export default function HomePage() {
  const d = useData();
  const { scope, month } = d;
  const [explain, setExplain] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const router = useRouter();

  const s = useMemo(
    () =>
      homeSummary({
        accounts: d.accounts, transactions: d.transactions, recurring: d.recurring_expenses,
        scheduled: d.scheduled_transactions, month, scope,
      }),
    [d.accounts, d.transactions, d.recurring_expenses, d.scheduled_transactions, month, scope],
  );

  const monthTx = useMemo(() => txOfMonth(d.transactions, month), [d.transactions, month]);
  const cats = byCategory(monthTx, scope, d.categories);
  const alerts = budgetLines(d.budgets, d.categories, d.transactions, month).filter((l) => l.level !== "ok");
  const charges = s.isCurrent
    ? upcomingCharges(d.recurring_expenses, d.scheduled_transactions, scope)
    : s.occ.filter((o) => o.status === "pending").slice(0, 4);

  // Qui a dépensé quoi ce mois-ci
  const people = [
    ...d.members.map((m) => ({
      id: m.user_id, name: m.profile?.first_name ?? "…", color: m.profile?.color ?? "#C5B6F2", profile: m.profile,
      cents: monthTx.filter((t) => t.kind === "expense" && t.assigned_to === m.user_id).reduce((a, t) => a + t.amount_cents, 0),
    })),
    {
      id: "common", name: "Commun", color: "#C5B6F2", profile: undefined,
      cents: monthTx.filter((t) => t.kind === "expense" && t.assigned_to === null).reduce((a, t) => a + t.amount_cents, 0),
    },
  ];
  const topCatFor = (who: string | null) => {
    const list = byCategory(monthTx.filter((t) => t.assigned_to === who), "all", d.categories);
    return list[0];
  };

  // Prévision fin de mois des comptes courants
  const projections = d.accounts
    .filter((a) => !a.archived && a.type !== "epargne" && a.type !== "especes" && (scope === "all" || a.owner_id === scope))
    .map((a) => ({ a, ...accountProjection(a, d.recurring_expenses, d.scheduled_transactions) }));
  const negatives = projections.filter((p) => p.projected < 0);

  // Épargne : comptes d'investissement (Trade Republic) + projets
  const invest = d.accounts.filter((a) => !a.archived && a.type === "epargne" && (scope === "all" || a.owner_id === scope));
  const goals = d.savings_goals.filter((g) => !g.archived && goalInScope(g, scope));

  const title = d.members.length > 1 ? d.members.map((m) => m.profile?.first_name).filter(Boolean).join(" & ") : d.household?.name;
  const heroLabel = s.isCurrent ? "Reste à vivre" : s.isPast ? "Bilan du mois" : "Charges prévues";

  return (
    <Page>
      <header className="flex items-center gap-3 pt-2">
        <LogoLoop />
        <h1 className="font-display min-w-0 flex-1 truncate text-[21px] font-semibold text-ink">{title}</h1>
        <Link href="/budgets" aria-label="Alertes" className="press relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
          <Bell size={20} />
          {(alerts.length > 0 || negatives.length > 0) && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-peche ring-2 ring-surface" />}
        </Link>
        <Link href="/profil" aria-label="Profil">
          <Avatar profile={d.me} size={40} />
        </Link>
      </header>

      <ScopeSwitcher className="mt-5" />
      <MonthSwitcher className="mt-4" />

      {/* Reste à vivre */}
      <section className="animate-rise bg-grad-hero relative mt-4 overflow-hidden rounded-[26px] p-5 text-aubergine">
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
          {s.isCurrent ? `jusqu'au ${daysInMonth(month)} ${monthName(month)}` : s.isPast ? "revenus − dépenses" : `à prélever en ${monthName(month)}`}
        </p>
        {explain && (
          <p className="animate-fade relative mt-3 max-w-[70%] rounded-2xl bg-white/50 p-3 text-[12.5px] leading-snug">
            {s.isCurrent
              ? `Solde des comptes courants (${money(s.available)}) moins les charges fixes encore à prélever ce mois-ci (${money(s.pendingCharges)}).`
              : s.isPast
                ? "Pour un mois passé : total des revenus moins total des dépenses."
                : "Pour un mois à venir : somme des charges fixes prévues."}
          </p>
        )}
      </section>

      {/* Indicateurs */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="animate-rise" onClick={() => router.push("/profil/comptes")}>
          <Wallet size={20} className="text-muted" />
          <p className="mt-2 text-[13px] text-muted">Comptes courants</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.available)}</p>
        </Card>
        <Card className="animate-rise" onClick={() => router.push("/budgets?vue=epargne")}>
          <Landmark size={20} className="text-muted" />
          <p className="mt-2 text-[13px] text-muted">Épargne investie</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.savingsBalance)}</p>
        </Card>
        <Card className="animate-rise">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ok/15 text-ok">
            <ArrowDownLeft size={16} />
          </span>
          <p className="mt-2 text-[13px] text-muted">Revenus</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.income)}</p>
        </Card>
        <Card className="animate-rise" onClick={() => router.push("/depenses")}>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-peche/20 text-peche">
            <ArrowUpRight size={16} />
          </span>
          <p className="mt-2 text-[13px] text-muted">Dépenses</p>
          <p className="font-display tabular text-[20px] font-semibold text-ink">{money(s.expense)}</p>
        </Card>
      </div>

      {/* Alertes : comptes qui finiront dans le rouge, budgets */}
      {(negatives.length > 0 || alerts.length > 0) && (
        <div className="mt-3 space-y-2">
          {negatives.map((p) => (
            <Link key={p.a.id} href="/profil/comptes" className="press flex items-center gap-3 rounded-[22px] border border-over/30 bg-over/10 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-over/20 text-over">
                <TriangleAlert size={20} />
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                <b>{p.a.name}</b> : {money(p.projected)} prévu fin de mois
                <span className="block text-[13px] text-muted">
                  {p.pending > 0 ? `Encore ${money(p.pending)} de prélèvements à venir` : "Déjà dans le rouge"}
                </span>
              </span>
            </Link>
          ))}
          {alerts.length > 0 && (
            <Link href="/budgets" className="press flex items-center gap-3 rounded-[22px] bg-surface p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
                <TriangleAlert size={20} />
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                {alerts.slice(0, 2).map((a) => `${a.category?.name} ${Math.round(a.ratio * 100)} %`).join(" · ")}
                <span className="block text-[13px] text-muted">
                  {alerts.some((a) => a.level === "over") ? "Budget dépassé" : "Budget bientôt atteint"}
                </span>
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Le camembert du mois */}
      <SectionTitle href="/stats" action="Analyse">Où part l&apos;argent</SectionTitle>
      <Card>
        <div className="flex items-center gap-4">
          <Donut
            size={150}
            thickness={20}
            segments={cats.map((c) => ({ value: c.cents, color: c.color }))}
            center={
              <>
                <span className="font-display tabular text-[19px] font-semibold text-ink">{moneyShort(s.expense)}</span>
                <span className="text-[11px] text-muted">{monthName(month)}</span>
              </>
            }
          />
          <ul className="min-w-0 flex-1 space-y-1.5">
            {cats.slice(0, catOpen ? cats.length : 5).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                <span className="tabular text-muted">{moneyShort(c.cents)}</span>
              </li>
            ))}
            {cats.length === 0 && <li className="text-sm text-muted">Aucune dépense ce mois-ci.</li>}
          </ul>
        </div>
        {cats.length > 5 && (
          <button onClick={() => setCatOpen((v) => !v)} className="mt-3 w-full text-center text-[13px] font-medium text-muted">
            {catOpen ? "Moins de détails" : `+ ${cats.length - 5} catégories`}
          </button>
        )}
      </Card>

      {/* Qui a dépensé quoi */}
      {scope === "all" && d.members.length > 1 && (
        <>
          <SectionTitle href="/profil/repartition" action="Répartition">Qui a dépensé</SectionTitle>
          <Card>
            <SplitBar parts={people.map((p) => ({ value: p.cents, color: p.color }))} />
            <div className="mt-3 space-y-3">
              {people.map((p) => {
                const top = topCatFor(p.id === "common" ? null : p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    {p.profile ? <Avatar profile={p.profile} size={34} /> : <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-grad-lav" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">{p.name}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {top ? `Surtout ${top.name.toLowerCase()} · ${moneyShort(top.cents)}` : "Rien ce mois-ci"}
                      </span>
                    </span>
                    <span className="tabular text-[15px] font-semibold text-ink">{money(p.cents)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Prévision des comptes */}
      {s.isCurrent && projections.length > 0 && (
        <>
          <SectionTitle>Fin de mois prévue</SectionTitle>
          <Card className="py-2">
            {projections.map((p) => (
              <div key={p.a.id} className="flex items-center gap-3 py-2">
                <IconBubble name={p.a.icon} color={p.a.color} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{p.a.name}</span>
                  <span className="block text-[12px] text-muted">Aujourd&apos;hui {money(p.a.balance_cents)}</span>
                </span>
                <span className={cx("tabular text-[15px] font-semibold", p.projected < 0 ? "text-over" : "text-ink")}>{money(p.projected)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Prochaines charges */}
      <SectionTitle href="/profil/charges" action="Gérer">Prochaines charges</SectionTitle>
      <Card className="py-2">
        {charges.length === 0 ? (
          <div className="flex items-center gap-3 py-3 text-sm text-muted">
            <CalendarClock size={20} />
            {d.recurring_expenses.length ? "Toutes les charges sont réglées." : "Ajoutez vos charges fixes (loyer, crédit…)."}
          </div>
        ) : (
          charges.map((o) => {
            const cat = d.categories.find((c) => c.id === o.recurring.category_id);
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
                  <span className={`block text-[13px] ${o.due_on < today() ? "text-over" : "text-muted"}`}>{relativeDue(o.due_on)}</span>
                </span>
                <span className="tabular text-[15px] font-semibold text-ink">{money(o.amount_cents)}</span>
              </button>
            );
          })
        )}
      </Card>

      {/* Épargne */}
      <SectionTitle href="/budgets?vue=epargne" action="Modifier">Épargne</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {invest.map((a) => (
          <Card key={a.id} onClick={() => router.push("/budgets?vue=epargne")} className="overflow-hidden">
            <span className="mb-2 block h-1 w-10 rounded-full" style={{ background: a.color }} />
            <p className="truncate text-[13px] text-muted">{a.owner_id ? d.nameOf(a.owner_id) : "Commun"}</p>
            <p className="truncate text-[12px] text-muted/80">{a.name.replace(/ (Guillaume|Emma)$/, "")}</p>
            <p className="font-display tabular mt-1 text-[20px] font-semibold text-ink">{money(a.balance_cents)}</p>
          </Card>
        ))}
      </div>
      {goals.length > 0 && (
        <Card className="mt-3">
          <div className="space-y-2.5">
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
          <Link href="/budgets?vue=epargne" className="mt-3 flex items-center justify-center gap-1 text-[13px] font-medium text-muted">
            Tous les projets <ChevronRight size={14} />
          </Link>
        </Card>
      )}
    </Page>
  );
}
