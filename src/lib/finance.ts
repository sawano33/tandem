import type {
  Account,
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

export const accountInScope = (a: Account, scope: Scope) => scope === "all" || a.owner_id === scope;

export const isSpendable = (a: Account) => a.type !== "epargne";

export function txOfMonth(txs: Transaction[], month: Date) {
  const k = monthKey(month);
  return txs.filter((t) => t.occurred_on.startsWith(k));
}

export function txBetween(txs: Transaction[], from: Date, toExclusive: Date) {
  const a = toISODate(from);
  const b = toISODate(toExclusive);
  return txs.filter((t) => t.occurred_on >= a && t.occurred_on < b);
}

/** Les virements internes ne sont jamais comptés comme dépenses ou revenus. */
export function totals(txs: Transaction[], scope: Scope) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.kind === "transfer" || !inScope(t.assigned_to, scope)) continue;
    if (t.kind === "income") income += t.amount_cents;
    else expense += t.amount_cents;
  }
  return { income, expense, net: income - expense };
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
        status: s ? s.status : "pending",
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
  const list = [
    ...occurrencesForMonth(recurring, scheduled, now, scope),
    ...occurrencesForMonth(recurring, scheduled, addMonths(now, 1), scope),
  ].filter((o) => o.status === "pending");
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

// ------------------------------------------------------------------ Synthèse de l'accueil
export function homeSummary(params: {
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringExpense[];
  scheduled: ScheduledTransaction[];
  month: Date;
  scope: Scope;
}) {
  const { accounts, transactions, recurring, scheduled, month, scope } = params;
  const visible = accounts.filter((a) => !a.archived && accountInScope(a, scope));
  const available = visible.filter(isSpendable).reduce((s, a) => s + a.balance_cents, 0);
  const savingsBalance = visible.filter((a) => a.type === "epargne").reduce((s, a) => s + a.balance_cents, 0);

  const monthTx = txOfMonth(transactions, month);
  const { income, expense } = totals(monthTx, scope);

  const occ = occurrencesForMonth(recurring, scheduled, month, scope);
  const pendingCharges = occ.filter((o) => o.status === "pending").reduce((s, o) => s + o.amount_cents, 0);

  const now = new Date();
  const isCurrent = monthKey(now) === monthKey(month);
  const isPast = month < new Date(now.getFullYear(), now.getMonth(), 1);

  // Mois en cours : ce qu'il reste réellement une fois les prélèvements prévus passés.
  // Mois passé : bilan revenus − dépenses. Mois futur : bilan prévisionnel des charges.
  const resteAVivre = isCurrent ? available - pendingCharges : isPast ? income - expense : -pendingCharges;

  return { available, savingsBalance, income, expense, pendingCharges, resteAVivre, isCurrent, isPast, occ };
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

// ------------------------------------------------------------------ Prévision par compte
/** Solde prévu en fin de mois : solde actuel moins les charges fixes encore à prélever sur ce compte. */
export function accountProjection(account: Account, recurring: RecurringExpense[], scheduled: ScheduledTransaction[]) {
  const pending = occurrencesForMonth(recurring, scheduled, new Date(), "all")
    .filter((o) => o.status === "pending" && o.recurring.account_id === account.id)
    .reduce((s, o) => s + o.amount_cents, 0);
  return { pending, projected: account.balance_cents - pending };
}

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
