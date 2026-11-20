"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, ChevronRight, Info, TriangleAlert } from "lucide-react";
import { useData } from "@/lib/store";
import { daysInMonth, money, moneyShort, monthName, pct, relativeDue, today } from "@/lib/format";
import {
  budgetLines, byCategory, computeSplit, goalInScope, goalSaved, homeSummary, monthIncome, occurrencesForMonth,
  personForecast, txOfMonth, upcomingCharges, usageSlices,
} from "@/lib/finance";
import { IconBubble } from "@/lib/icons";
import { LogoLoop } from "@/components/Logo";
import { MonthSwitcher, ScopeSwitcher } from "@/components/Switchers";
import { Pie, SplitBar } from "@/components/Charts";
import { Avatar, Card, Page, Progress, SectionTitle, cx } from "@/components/ui";

export default function HomePage() {
  const d = useData();
  const { scope, month } = d;
  const router = useRouter();
  const [explain, setExplain] = useState(false);
  const [slice, setSlice] = useState<string | null>(null);

  const memberIds = d.members.map((m) => m.user_id);
  const planned = d.household?.split_settings?.incomes;
  const s = useMemo(
    () => homeSummary({ transactions: d.transactions, recurring: d.recurring_expenses, scheduled: d.scheduled_transactions, month, scope, memberIds, planned }),
    [d.transactions, d.recurring_expenses, d.scheduled_transactions, month, scope, memberIds.join(), planned], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const monthTx = useMemo(() => txOfMonth(d.transactions, month), [d.transactions, month]);
  const usage = usageSlices({ monthTx, scope, categories: d.categories, income: s.income, saving: s.saving, pendingCharges: s.isPast ? 0 : s.pendingCharges });
  const sel = usage.slices.find((x) => x.id === slice);

  const alerts = budgetLines(d.budgets, d.categories, d.transactions, month).filter((l) => l.level !== "ok");
  const charges = s.isCurrent ? upcomingCharges(d.recurring_expenses, d.scheduled_transactions, scope) : s.occ.filter((o) => o.status === "pending").slice(0, 4);

  // Fin de mois par personne (avec la répartition choisie pour le commun)
  const split = computeSplit({
    mode: d.household?.split_settings?.mode ?? "equal_rate", memberIds,
    incomes: Object.fromEntries(memberIds.map((id) => [id, monthIncome({ transactions: d.transactions, month, scope: id, memberIds, planned }).income])),
    custom: d.household?.split_settings?.custom, recurring: d.recurring_expenses, transactions: d.transactions, categories: d.categories,
  });
  const allOcc = occurrencesForMonth(d.recurring_expenses, d.scheduled_transactions, month, "all");
  const forecasts = split.lines
    .filter((l) => scope === "all" || l.user_id === scope)
    .map((l) => ({ l, profile: d.members.find((m) => m.user_id === l.user_id)?.profile, f: personForecast({ userId: l.user_id, share: l.share, income: l.income, monthTx, occ: s.isPast ? [] : allOcc }) }));
  const inRed = forecasts.filter((x) => x.f.left < 0);

  // Qui a dépensé quoi
  const people = [
    ...d.members.map((m) => ({
      id: m.user_id, name: m.profile?.first_name ?? "…", color: m.profile?.color ?? "#C5B6F2", profile: m.profile,
      cents: monthTx.filter((t) => t.kind === "expense" && t.assigned_to === m.user_id).reduce((a, t) => a + t.amount_cents, 0),
    })),
    { id: "common", name: "Commun", color: "#F4EFF8", profile: undefined, cents: monthTx.filter((t) => t.kind === "expense" && t.assigned_to === null).reduce((a, t) => a + t.amount_cents, 0) },
  ];
  const topCatFor = (who: string | null) => byCategory(monthTx.filter((t) => t.assigned_to === who), "all", d.categories)[0];

  const invest = d.accounts.filter((a) => !a.archived && a.type === "epargne" && (scope === "all" || a.owner_id === scope));
  const goals = d.savings_goals.filter((g) => !g.archived && goalInScope(g, scope));
  const title = d.members.length > 1 ? d.members.map((m) => m.profile?.first_name).filter(Boolean).join(" & ") : d.household?.name;

  return (
    <Page>
      <header className="flex items-center gap-3 pt-2">
        <LogoLoop />
        <h1 className="font-display min-w-0 flex-1 truncate text-[21px] font-semibold text-ink">{title}</h1>
        <Link href="/budgets" aria-label="Alertes" className="press relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
          <Bell size={20} />
          {(alerts.length > 0 || inRed.length > 0) && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-peche ring-2 ring-surface" />}
        </Link>
        <Link href="/profil" aria-label="Profil">
          <Avatar profile={d.me} size={40} />
        </Link>
      </header>

      <ScopeSwitcher className="mt-5" />
      <MonthSwitcher className="mt-4" />

      {/* Reste du mois */}
      <section className="animate-rise bg-grad-hero relative mt-4 overflow-hidden rounded-[26px] p-5 text-aubergine">
        <svg viewBox="0 0 200 140" className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-56" aria-hidden>
          <path d="M40 160 C40 90 90 50 150 50 C185 50 210 70 210 70 L210 160Z" fill="#251D40" />
          <path d="M120 160 C120 95 150 30 205 25" fill="none" stroke="#C5B6F2" strokeWidth="26" strokeLinecap="round" />
        </svg>
        <button onClick={() => setExplain((v) => !v)} className="relative flex items-center gap-1.5 text-[17px] font-semibold">
          <span className="font-display">{s.isPast ? "Bilan du mois" : "Reste à vivre"}</span>
          <Info size={16} className="opacity-70" />
        </button>
        <p className="font-num tabular relative mt-1 text-[42px] font-semibold leading-none">{money(s.resteAVivre)}</p>
        <p className="relative mt-2 max-w-[60%] text-[13px] opacity-80">
          {s.isPast ? "revenus − dépenses − épargne" : `jusqu'au ${daysInMonth(month)} ${monthName(month)}`}
        </p>
        {explain && (
          <p className="animate-fade relative mt-3 max-w-[72%] rounded-2xl bg-white/55 p-3 text-[12.5px] leading-snug">
            Revenus {money(s.income)}{s.estimated ? " (salaire prévu)" : ""} − dépenses {money(s.expense)} − épargne {money(s.saving)}
            {!s.isPast && ` − charges à venir ${money(s.pendingCharges)}`}.
          </p>
        )}
      </section>

      {/* Camembert d'utilisation */}
      <SectionTitle href="/stats" action="Analyse">Utilisation du budget</SectionTitle>
      <Card className="!p-5">
        <div className="flex flex-col items-center">
          <Pie size={232} slices={usage.slices.map((x) => ({ id: x.id, value: x.cents, color: x.color }))} selected={slice} onSelect={setSlice} />
          <div className="mt-4 min-h-12 text-center">
            {sel ? (
              <>
                <p className="font-num tabular text-[24px] font-semibold text-ink">{money(sel.cents)}</p>
                <p className="text-[13px] text-muted">
                  {sel.name} · {Math.round(sel.share * 100)} % des revenus
                </p>
              </>
            ) : (
              <>
                <p className="font-num tabular text-[24px] font-semibold text-ink">{money(s.income)}</p>
                <p className="text-[13px] text-muted">
                  de revenus{s.estimated ? " (salaire prévu)" : ""} · touchez une part
                </p>
              </>
            )}
          </div>
        </div>
        {usage.overspent > 0 && (
          <p className="mt-3 rounded-2xl bg-over/12 px-4 py-2.5 text-center text-sm font-medium text-over">
            Dépassement de {money(usage.overspent)} sur les revenus du mois
          </p>
        )}
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {usage.slices.map((x) => (
            <li key={x.id}>
              <button onClick={() => setSlice(slice === x.id ? null : x.id)} className={cx("flex w-full items-center gap-2 text-left text-[13px]", slice && slice !== x.id && "opacity-45")}>
                <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: x.color }} />
                <span className="min-w-0 flex-1 truncate text-ink">{x.name}</span>
                <span className="tabular text-muted">{Math.round(x.share * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Alertes */}
      {(inRed.length > 0 || alerts.length > 0) && (
        <div className="mt-3 space-y-2">
          {inRed.map(({ l, profile, f }) => (
            <div key={l.user_id} className="flex items-center gap-3 rounded-[22px] border border-over/30 bg-over/10 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-over/20 text-over">
                <TriangleAlert size={20} />
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                <b>{profile?.first_name}</b> : {money(f.left)} prévu en fin de mois
                <span className="block text-[13px] text-muted">Dépenses perso {money(f.personal)} · part du commun {money(f.commonPart)}</span>
              </span>
            </div>
          ))}
          {alerts.length > 0 && (
            <Link href="/budgets" className="press flex items-center gap-3 rounded-[22px] bg-surface p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
                <TriangleAlert size={20} />
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                {alerts.slice(0, 2).map((a) => `${a.category?.name} ${Math.round(a.ratio * 100)} %`).join(" · ")}
                <span className="block text-[13px] text-muted">{alerts.some((a) => a.level === "over") ? "Budget dépassé" : "Budget bientôt atteint"}</span>
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Fin de mois par personne */}
      {d.members.length > 1 && (
        <>
          <SectionTitle href="/profil/repartition" action="Répartition">Fin de mois prévue</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {forecasts.map(({ l, profile, f }) => (
              <Card key={l.user_id}>
                <div className="flex items-center gap-2">
                  <Avatar profile={profile} size={26} />
                  <span className="truncate text-sm font-medium text-ink">{profile?.first_name}</span>
                </div>
                <p className={cx("font-num tabular mt-2 text-[22px] font-semibold", f.left < 0 ? "text-over" : "text-ink")}>{money(f.left)}</p>
                <p className="text-[11.5px] leading-snug text-muted">
                  sur {moneyShort(f.income)} · {f.saving > 0 ? `${moneyShort(f.saving)} épargnés` : "rien d'épargné"}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Qui a dépensé */}
      {scope === "all" && d.members.length > 1 && (
        <>
          <SectionTitle href="/depenses">Qui a dépensé</SectionTitle>
          <Card>
            <SplitBar parts={people.map((p) => ({ value: p.cents, color: p.color }))} />
            <div className="mt-3 space-y-3">
              {people.map((p) => {
                const top = topCatFor(p.id === "common" ? null : p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    {p.profile ? <Avatar profile={p.profile} size={34} /> : <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-lilas" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">{p.name}</span>
                      <span className="block truncate text-[12px] text-muted">{top ? `Surtout ${top.name.toLowerCase()} · ${moneyShort(top.cents)}` : "Rien ce mois-ci"}</span>
                    </span>
                    <span className="tabular text-[15px] font-semibold text-ink">{money(p.cents)}</span>
                  </div>
                );
              })}
            </div>
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
                    preset: { amount_cents: o.amount_cents, label: o.recurring.label, category_id: o.recurring.category_id, assigned_to: o.recurring.assigned_to, occurred_on: o.due_on },
                  })
                }
                className="press flex w-full items-center gap-3 py-2.5 text-left"
              >
                <IconBubble name={cat?.icon ?? "repeat"} color={cat?.color ?? "#9C8FE0"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{o.recurring.label}</span>
                  <span className={`block text-[13px] ${o.due_on < today() ? "text-over" : "text-muted"}`}>
                    {relativeDue(o.due_on)} · {d.nameOf(o.recurring.assigned_to)}
                  </span>
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
          <Card key={a.id} onClick={() => router.push("/budgets?vue=epargne")}>
            <span className="mb-2 block h-1 w-10 rounded-full" style={{ background: a.color }} />
            <p className="truncate text-[13px] text-muted">{a.owner_id ? d.nameOf(a.owner_id) : "Commun"}</p>
            <p className="truncate text-[12px] text-muted/80">{a.name.replace(/ (Guillaume|Emma)$/, "")}</p>
            <p className="font-num tabular mt-1 text-[20px] font-semibold text-ink">{money(a.balance_cents)}</p>
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
