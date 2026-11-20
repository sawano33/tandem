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
import { SplitBar } from "@/components/Charts";
import { UsageCard } from "@/components/UsageCard";
import { Avatar, Card, Page, Progress, SectionTitle, cx } from "@/components/ui";

export default function HomePage() {
  const d = useData();
  const { scope, month } = d;
  const router = useRouter();
  const [explain, setExplain] = useState(false);

  const memberIds = d.members.map((m) => m.user_id);
  const planned = d.household?.split_settings?.incomes;
  const s = useMemo(
    () => homeSummary({ transactions: d.transactions, recurring: d.recurring_expenses, scheduled: d.scheduled_transactions, month, scope, memberIds, planned }),
    [d.transactions, d.recurring_expenses, d.scheduled_transactions, month, scope, memberIds.join(), planned], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const monthTx = useMemo(() => txOfMonth(d.transactions, month), [d.transactions, month]);
  const usage = usageSlices({ monthTx, scope, categories: d.categories, income: s.income, saving: s.saving, pendingCharges: s.isPast ? 0 : s.pendingCharges });

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
    { id: "common", name: "Commun", color: "#8E84AE", profile: undefined, cents: monthTx.filter((t) => t.kind === "expense" && t.assigned_to === null).reduce((a, t) => a + t.amount_cents, 0) },
  ];
  const topCatFor = (who: string | null) => byCategory(monthTx.filter((t) => t.assigned_to === who), "all", d.categories)[0];

  const invest = d.accounts.filter((a) => !a.archived && a.type === "epargne" && (scope === "all" || a.owner_id === scope));
  const goals = d.savings_goals.filter((g) => !g.archived && goalInScope(g, scope));

  return (
    <Page>
      {/* En-tête : logo animé au centre, alertes à gauche, profil à droite */}
      <header className="grid grid-cols-[48px_1fr_48px] items-center pt-2">
        <Link href="/budgets" aria-label="Alertes" className="press relative flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink">
          <Bell size={20} />
          {(alerts.length > 0 || inRed.length > 0) && <span className="breathe absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-peche ring-2 ring-surface" />}
        </Link>
        <h1 className="flex justify-center">
          <LogoLoop size={26} wordHeight={26} withWord />
        </h1>
        <Link href="/profil" aria-label="Profil" className="justify-self-end">
          <Avatar profile={d.me} size={44} />
        </Link>
      </header>

      <ScopeSwitcher className="mt-5" />
      <MonthSwitcher className="mt-4" />

      {/* Reste du mois : carte sobre, chiffre en grand, revenus / dépenses / épargne dessous */}
      {(() => {
        const engaged = s.expense + s.saving + (s.isPast ? 0 : s.pendingCharges);
        const ratio = s.income ? engaged / s.income : 0;
        return (
          <section className="animate-rise mt-4 rounded-[26px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setExplain((v) => !v)} className="flex items-center gap-1.5 text-[14px] font-medium text-muted">
                {s.isPast ? "Bilan du mois" : "Reste à vivre"} <Info size={14} />
              </button>
              {!s.isPast && (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted">
                  jusqu&apos;au {daysInMonth(month)} {monthName(month)}
                </span>
              )}
            </div>
            <p key={`${month.getTime()}-${scope}`} className={cx("num-in font-num tabular mt-1 text-[44px] font-semibold leading-tight", s.resteAVivre < 0 ? "text-over" : "text-ink")}>
              {money(s.resteAVivre)}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-track">
              <div
                className="grow-x h-full rounded-full transition-[width] duration-700"
                style={{ width: `${Math.min(100, ratio * 100)}%`, background: ratio > 1 ? "#FF7D8C" : "linear-gradient(90deg,#FFAE97,#C5B6F2)" }}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-muted">{Math.round(ratio * 100)} % des revenus déjà engagés</p>
            {explain && (
              <p className="animate-fade mt-3 rounded-2xl bg-surface-2 p-3 text-[12.5px] leading-snug text-muted">
                Revenus{s.estimated ? " (salaire prévu)" : ""} − dépenses − épargne{!s.isPast && " − charges fixes encore à venir"}.
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {[
                ["Revenus", s.income, "text-ok"],
                ["Dépenses", s.expense, "text-peche"],
                ["Épargne", s.saving, "text-lavande"],
              ].map(([label, v, c]) => (
                <div key={label as string}>
                  <p className={cx("text-[12px] font-medium", c as string)}>{label as string}</p>
                  <p className="font-num tabular text-[16px] font-semibold text-ink">{money(v as number).replace(/,\d\d\s?€/, " €")}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Camembert d'utilisation */}
      <div className="mt-3">
        <UsageCard key={`${month.getTime()}-${scope}`} usage={usage} income={s.income} estimated={s.estimated} />
      </div>

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
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, f.income ? (f.left / f.income) * 100 : 0))}%`, background: profile?.color ?? "#C5B6F2" }} />
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-muted">
                  restants sur {moneyShort(f.income)} · {f.saving > 0 ? `${moneyShort(f.saving)} épargnés` : "rien d'épargné"}
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
                    {p.profile ? <Avatar profile={p.profile} size={34} /> : <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#8E84AE] text-[13px] font-semibold text-aubergine">G+E</span>}
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
