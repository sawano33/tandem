import type {
  Budget,
  Category,
  RecurringExpense,
  SavingsContribution,
  SavingsGoal,
  ScheduledTransaction,
  Scope,
  Transaction,
} from "./types";
import { addMonths, daysInMonth, monthISO, monthKey, pad, parseISODate, today, toISODate } from "./format";

// ------------------------------------------------------------------ Périmètre
/** Une transaction appartient au périmètre si elle est attribuée à la personne (ou tout, pour Ensemble). */
export const inScope = (assignedTo: string | null, scope: Scope) => scope === "all" || assignedTo === scope;


export function txOfMonth(txs: Transaction[], month: Date) {
  const k = monthKey(month);
  return txs.filter((t) => t.occurred_on.startsWith(k));
}

export function txBetween(txs: Transaction[], from: Date, toExclusive: Date) {
  const a = toISODate(from);
  const b = toISODate(toExclusive);
  return txs.filter((t) => t.occurred_on >= a && t.occurred_on < b);
}

/** L'épargne mise de côté n'est pas une dépense : elle est comptée à part. */
export function totals(txs: Transaction[], scope: Scope) {
  let income = 0;
  let expense = 0;
  let saving = 0;
  for (const t of txs) {
    if (!inScope(t.assigned_to, scope)) continue;
    if (t.kind === "income") income += t.amount_cents;
    else if (t.kind === "saving") saving += t.amount_cents;
    else expense += t.amount_cents;
  }
  return { income, expense, saving, net: income - expense - saving };
}

export function byCategory(txs: Transaction[], scope: Scope, categories: Category[]) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== "expense" || !inScope(t.assigned_to, scope)) continue;
    const key = t.category_id ?? "none";
    map.set(key, (map.get(key) ?? 0) + t.amount_cents);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([id, cents]) => {
      const cat = categories.find((c) => c.id === id);
      return {
        id,
        name: cat?.name ?? "Sans catégorie",
        icon: cat?.icon ?? "tag",
        color: cat?.color ?? "#ABA4BF",
        cents,
        share: total ? cents / total : 0,
      };
    })
    .sort((a, b) => b.cents - a.cents);
}

// ------------------------------------------------------------------ Charges fixes
export type Occurrence = {
  recurring: RecurringExpense;
  due_on: string;
  amount_cents: number;
  status: "pending" | "paid" | "skipped";
  /** décochée à la main : le prélèvement automatique ne la recoche pas */
  held?: boolean;
  scheduled?: ScheduledTransaction;
};

const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();

/** Dates d'échéance d'une charge pour un mois donné. */
export function dueDatesInMonth(r: RecurringExpense, month: Date): string[] {
  if (!r.active) return [];
  const start = parseISODate(r.start_date);
  const end = r.end_date ? parseISODate(r.end_date) : null;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth(), daysInMonth(month));
  if (end && end < first) return [];
  if (start > last) return [];

  const dates: Date[] = [];
  if (r.frequency === "weekly") {
    const d = new Date(start);
    while (d < first) d.setDate(d.getDate() + 7);
    while (d <= last) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
  } else {
    const step = r.frequency === "monthly" ? 1 : r.frequency === "quarterly" ? 3 : 12;
    const diff = monthsBetween(new Date(start.getFullYear(), start.getMonth(), 1), first);
    if (diff >= 0 && diff % step === 0) {
      const day = Math.min(r.day_of_month, daysInMonth(month));
      dates.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
  }
  return dates
    .filter((d) => d >= start && (!end || d <= end))
    .map(toISODate);
}

export function occurrencesForMonth(
  recurring: RecurringExpense[],
  scheduled: ScheduledTransaction[],
  month: Date,
  scope: Scope,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const r of recurring) {
    if (!inScope(r.assigned_to, scope)) continue;
    for (const due of dueDatesInMonth(r, month)) {
      const s = scheduled.find((x) => x.recurring_expense_id === r.id && x.due_on === due);
      out.push({
        recurring: r,
        due_on: due,
        amount_cents: s?.amount_cents ?? r.amount_cents,
        status: !s || s.status === "unpaid" ? "pending" : s.status,
        held: s?.status === "unpaid",
        scheduled: s,
      });
    }
  }
  return out.sort((a, b) => a.due_on.localeCompare(b.due_on));
}

/** Prochaines charges à régler : celles du mois en cours, puis du mois suivant. */
export function upcomingCharges(
  recurring: RecurringExpense[],
  scheduled: ScheduledTransaction[],
  scope: Scope,
  limit = 4,
) {
  const now = new Date();
  const t = today();
  // Seulement ce qui arrive : une date passée non cochée n'est pas « en retard ».
  const list = [
    ...occurrencesForMonth(recurring, scheduled, now, scope),
    ...occurrencesForMonth(recurring, scheduled, addMonths(now, 1), scope),
  ].filter((o) => o.status === "pending" && o.due_on >= t);
  return list.slice(0, limit);
}

/** Échéance non réglée qui pourrait correspondre à une dépense saisie (anti-doublon). */
export function matchPendingCharge(
  occurrences: Occurrence[],
  input: { amount_cents: number | null; label: string; category_id: string | null },
) {
  const pending = occurrences.filter((o) => o.status === "pending");
  const label = input.label.trim().toLowerCase();
  return (
    pending.find(
      (o) =>
        label.length >= 3 &&
        (o.recurring.label.toLowerCase().includes(label) || label.includes(o.recurring.label.toLowerCase())),
    ) ??
    pending.find(
      (o) =>
        input.amount_cents !== null &&
        Math.abs(o.amount_cents - input.amount_cents) <= Math.max(100, o.amount_cents * 0.02) &&
        (!input.category_id || !o.recurring.category_id || o.recurring.category_id === input.category_id),
    ) ??
    null
  );
}

// ------------------------------------------------------------------ Budgets
/** Budget applicable à un mois : celui du mois, sinon le dernier budget reconduit. */
export function effectiveBudgets(budgets: Budget[], month: Date) {
  const iso = monthISO(month);
  const exact = new Map<string, Budget>();
  const carried = new Map<string, Budget>();
  for (const b of [...budgets].sort((a, b) => a.month.localeCompare(b.month))) {
    if (b.month === iso) exact.set(b.category_id, b);
    else if (b.month < iso && b.is_recurring) carried.set(b.category_id, b);
  }
  const out = new Map(carried);
  exact.forEach((b, k) => out.set(k, b));
  return [...out.values()];
}

export type BudgetLine = {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  remaining: number;
  ratio: number;
  level: "ok" | "warn" | "over";
};

export function budgetLines(budgets: Budget[], categories: Category[], txs: Transaction[], month: Date): BudgetLine[] {
  const monthTx = txOfMonth(txs, month);
  return effectiveBudgets(budgets, month)
    .map((b) => {
      const spent = monthTx
        .filter((t) => t.kind === "expense" && t.category_id === b.category_id)
        .reduce((s, t) => s + t.amount_cents, 0);
      const ratio = spent / b.amount_cents;
      return {
        budget: b,
        category: categories.find((c) => c.id === b.category_id),
        spent,
        remaining: b.amount_cents - spent,
        ratio,
        level: (ratio > 1 ? "over" : ratio >= 0.8 ? "warn" : "ok") as BudgetLine["level"],
      };
    })
    .filter((l) => l.category && !l.category.archived)
    .sort((a, b) => b.ratio - a.ratio);
}

// ------------------------------------------------------------------ Épargne
export function goalSaved(goal: SavingsGoal, contributions: SavingsContribution[]) {
  return contributions.filter((c) => c.goal_id === goal.id).reduce((s, c) => s + c.amount_cents, 0);
}

export const goalInScope = (g: SavingsGoal, scope: Scope) => scope === "all" || g.owner_id === scope || g.owner_id === null;

// ------------------------------------------------------------------ Synthèse du mois
/** Revenus du mois : ceux saisis, sinon le salaire prévu (réglages de répartition) pour chaque personne. */
export function monthIncome(params: {
  transactions: Transaction[]; month: Date; scope: Scope; memberIds: string[]; planned?: Record<string, number>;
}) {
  const { transactions, month, scope, memberIds, planned } = params;
  const monthTx = txOfMonth(transactions, month);
  const now = new Date();
  const notPast = month >= new Date(now.getFullYear(), now.getMonth(), 1);
  let total = 0;
  let estimated = false;
  const people = scope === "all" ? [...memberIds, null] : [scope];
  for (const p of people) {
    const recorded = monthTx.filter((t) => t.kind === "income" && t.assigned_to === p).reduce((s, t) => s + t.amount_cents, 0);
    if (recorded === 0 && p && notPast && planned?.[p]) {
      total += planned[p];
      estimated = true;
    } else total += recorded;
  }
  return { income: total, estimated };
}

export function homeSummary(params: {
  transactions: Transaction[];
  recurring: RecurringExpense[];
  scheduled: ScheduledTransaction[];
  month: Date;
  scope: Scope;
  memberIds: string[];
  planned?: Record<string, number>;
}) {
  const { transactions, recurring, scheduled, month, scope } = params;
  const monthTx = txOfMonth(transactions, month);
  const { expense, saving } = totals(monthTx, scope);
  const { income, estimated } = monthIncome(params);
  const occ = occurrencesForMonth(recurring, scheduled, month, scope);
  const pendingCharges = occ.filter((o) => o.status === "pending" && !(o.held && o.due_on < today())).reduce((s, o) => s + o.amount_cents, 0);
  const now = new Date();
  const isCurrent = monthKey(now) === monthKey(month);
  const isPast = month < new Date(now.getFullYear(), now.getMonth(), 1);
  // Ce qu'il reste une fois les dépenses, l'épargne et les charges encore à venir retirées des revenus
  const resteAVivre = income - expense - saving - (isPast ? 0 : pendingCharges);
  // Ce qu'il reste tout de suite, avant de retirer les charges qui ne sont pas encore passées
  const dispo = income - expense - saving;
  return { income, estimated, expense, saving, pendingCharges, resteAVivre, dispo, isCurrent, isPast, occ };
}

/** Camembert d'utilisation des revenus : chaque catégorie, l'épargne, les charges à venir et le reste. */
export function usageSlices(params: {
  monthTx: Transaction[]; scope: Scope; categories: Category[]; income: number; saving: number; pendingCharges: number;
}) {
  const { monthTx, scope, categories, income, saving, pendingCharges } = params;
  const all = byCategory(monthTx, scope, categories).map((c) => ({ ...c, kind: "expense" as const }));
  const spent = all.reduce((s, c) => s + c.cents, 0);
  // Les petites catégories (< 4 % des revenus) sont regroupées pour garder un camembert lisible
  const base0 = Math.max(income, spent + saving + pendingCharges) || 1;
  const big = all.filter((c) => c.cents / base0 >= 0.04 && c.name !== "Autres");
  const small = all.filter((c) => !big.includes(c));
  const cats = [...big];
  if (small.length) {
    cats.push({
      id: "others", name: small.length === 1 ? small[0].name : "Autres", icon: "ellipsis", color: "#8E84AE", kind: "expense",
      cents: small.reduce((s, c) => s + c.cents, 0), share: 0,
      detail: small.map((c) => c.name).join(", "),
    } as (typeof all)[number] & { detail: string });
  }
  const slices: { id: string; name: string; color: string; icon: string; cents: number; kind: "expense" | "saving" | "pending" | "left"; detail?: string }[] = [...cats];
  if (saving > 0) slices.push({ id: "saving", name: "Épargne", color: "#F4EFF8", icon: "piggy-bank", cents: saving, kind: "saving" });
  if (pendingCharges > 0) slices.push({ id: "pending", name: "Charges à venir", color: "#5A4C8E", icon: "calendar-clock", cents: pendingCharges, kind: "pending" });
  const left = income - spent - saving - pendingCharges;
  if (left > 0) slices.push({ id: "left", name: "Reste", color: "#433873", icon: "wallet", cents: left, kind: "left" });
  const base = Math.max(income, spent + saving + pendingCharges);
  return {
    slices: slices.map((s) => ({ ...s, share: base ? s.cents / base : 0 })),
    groups: [
      { id: "spent", name: "Dépensé", cents: spent, color: "#FFAE97" },
      { id: "saving", name: "Épargné", cents: saving, color: "#F4EFF8" },
      { id: "pending", name: "À venir", cents: pendingCharges, color: "#7563C4" },
      { id: "left", name: "Reste", cents: Math.max(0, left), color: "#433873" },
    ].map((g) => ({ ...g, share: base ? g.cents / base : 0 })),
    base, left, overspent: left < 0 ? -left : 0,
  };
}

/** Dépenses cumulées jour par jour (pour la courbe « Mon mois »). */
export function cumulativeDaily(txs: Transaction[], month: Date, scope: Scope) {
  const days = daysInMonth(month);
  const k = monthKey(month);
  const daily = new Array(days).fill(0);
  for (const t of txs) {
    if (t.kind !== "expense" || !t.occurred_on.startsWith(k) || !inScope(t.assigned_to, scope)) continue;
    daily[Number(t.occurred_on.slice(8, 10)) - 1] += t.amount_cents;
  }
  const isCurrent = k === today().slice(0, 7);
  const lastDay = isCurrent ? Number(today().slice(8, 10)) : days;
  let acc = 0;
  return daily.slice(0, lastDay).map((v) => (acc += v));
}

export const monthsRange = (end: Date, count: number) =>
  Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1));

export { pad };

// ------------------------------------------------------------------ Répartition à deux
const PER_MONTH: Record<RecurringExpense["frequency"], number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
export const monthlyEquivalent = (r: RecurringExpense) => (r.active ? Math.round(r.amount_cents * PER_MONTH[r.frequency]) : 0);

export type SplitLine = {
  user_id: string;
  income: number;
  credits: number;
  personalFixed: number;
  share: number;
  contribution: number;
  left: number;
  leftRatio: number;
};

export function computeSplit(params: {
  mode: "equal" | "prorata" | "prorata_after_credits" | "equal_rate" | "custom";
  memberIds: string[];
  incomes: Record<string, number>;
  custom?: Record<string, number>;
  recurring: RecurringExpense[];
  transactions: Transaction[];
  categories: Category[];
}) {
  const { mode, memberIds, incomes, custom, recurring, transactions, categories } = params;
  const creditCat = categories.find((c) => c.name.toLowerCase().startsWith("crédit"))?.id;

  // Base commune : charges fixes communes, ou moyenne des dépenses communes des 3 derniers mois si plus élevée
  const commonFixed = recurring.filter((r) => r.assigned_to === null).reduce((s, r) => s + monthlyEquivalent(r), 0);
  const start = addMonths(new Date(), -3);
  const end = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const commonAvg = Math.round(
    txBetween(transactions, start, end)
      .filter((t) => t.kind === "expense" && t.assigned_to === null)
      .reduce((s, t) => s + t.amount_cents, 0) / 3,
  );
  const base = Math.max(commonFixed, commonAvg);

  const rows = memberIds.map((id) => {
    const mine = recurring.filter((r) => r.assigned_to === id);
    const credits = mine.filter((r) => r.category_id === creditCat).reduce((s, r) => s + monthlyEquivalent(r), 0);
    const personalFixed = mine.reduce((s, r) => s + monthlyEquivalent(r), 0);
    return { id, income: incomes[id] ?? 0, credits, personalFixed };
  });

  const weight = (r: (typeof rows)[number]) =>
    mode === "equal" ? 1 : mode === "prorata" ? r.income : mode === "prorata_after_credits" ? Math.max(0, r.income - r.credits) : (custom?.[r.id] ?? 0);
  const total = rows.reduce((s, r) => s + weight(r), 0) || 1;

  // « Même effort » : chacun garde le même % de son salaire après dépenses communes et charges perso
  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const keep = totalIncome ? (rows.reduce((s, r) => s + r.income - r.personalFixed, 0) - base) / totalIncome : 0;
  const rateContrib = rows.map((r) => Math.max(0, r.income - r.personalFixed - keep * r.income));
  const rateTotal = rateContrib.reduce((s, v) => s + v, 0) || 1;

  const lines: SplitLine[] = rows.map((r, i) => {
    const share = mode === "equal" ? 1 / rows.length : mode === "equal_rate" ? rateContrib[i] / rateTotal : weight(r) / total;
    const contribution = Math.round(base * share);
    const left = r.income - contribution - r.personalFixed;
    return { user_id: r.id, income: r.income, credits: r.credits, personalFixed: r.personalFixed, share, contribution, left, leftRatio: r.income ? left / r.income : 0 };
  });
  return { base, commonFixed, commonAvg, lines };
}

/** Revenus moyens des 3 derniers mois (pré-remplissage si non saisis). */
export function averageIncome(transactions: Transaction[], userId: string) {
  const start = addMonths(new Date(), -3);
  const end = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return Math.round(
    txBetween(transactions, start, end)
      .filter((t) => t.kind === "income" && t.assigned_to === userId)
      .reduce((s, t) => s + t.amount_cents, 0) / 3,
  );
}

/** Fin de mois prévue par personne : revenu − part des dépenses communes − dépenses perso − épargne − charges perso à venir. */
export function personForecast(params: {
  userId: string; share: number; income: number; monthTx: Transaction[]; occ: Occurrence[];
}) {
  const { userId, share, income, monthTx, occ } = params;
  const mine = monthTx.filter((t) => t.assigned_to === userId);
  const personal = mine.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount_cents, 0);
  const saving = mine.filter((t) => t.kind === "saving").reduce((s, t) => s + t.amount_cents, 0);
  const common =
    monthTx.filter((t) => t.kind === "expense" && t.assigned_to === null).reduce((s, t) => s + t.amount_cents, 0) +
    occ.filter((o) => o.status === "pending" && !(o.held && o.due_on < today()) && o.recurring.assigned_to === null).reduce((s, o) => s + o.amount_cents, 0);
  const pendingMine = occ.filter((o) => o.status === "pending" && !(o.held && o.due_on < today()) && o.recurring.assigned_to === userId).reduce((s, o) => s + o.amount_cents, 0);
  const commonPart = Math.round(common * share);
  return { income, commonPart, personal, saving, pendingMine, left: income - commonPart - personal - saving - pendingMine };
}

/**
 * Solde estimé du compte perso : le solde saisi (lu dans l'appli de la banque)
 * plus tout ce qui a été saisi à son nom depuis — revenus en plus, dépenses et épargne en moins.
 */
export function bankBalance(profile: { id: string; bank_balance_cents?: number | null; bank_balance_at?: string | null } | undefined, transactions: Transaction[]) {
  if (!profile || profile.bank_balance_cents == null || !profile.bank_balance_at) return null;
  const since = new Date(profile.bank_balance_at).getTime();
  let delta = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.assigned_to !== profile.id) continue;
    const at = t.created_at ? new Date(t.created_at).getTime() : Date.now();
    if (at <= since) continue;
    delta += t.kind === "income" ? t.amount_cents : -t.amount_cents;
    count++;
  }
  return { cents: profile.bank_balance_cents + delta, base: profile.bank_balance_cents, at: profile.bank_balance_at, delta, count };
}
