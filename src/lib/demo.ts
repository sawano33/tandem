/**
 * Mode démo : données fictives générées localement, sans Supabase.
 * Activé avec NEXT_PUBLIC_DEMO=1 (ou automatiquement si Supabase n'est pas configuré).
 */
import type {
  Account, Budget, Category, Holding, Household, Member, Profile, RecurringExpense, SavingsContribution,
  SavingsGoal, ScheduledTransaction, Transaction,
} from "./types";
import { addMonths, daysInMonth, monthISO, monthStart, toISODate } from "./format";
import { dueDatesInMonth } from "./finance";

export const IS_DEMO =
  process.env.NEXT_PUBLIC_DEMO === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const DEMO_G = "00000000-0000-4000-8000-0000000000a1";
export const DEMO_E = "00000000-0000-4000-8000-0000000000b2";
const H = "00000000-0000-4000-8000-00000000f001";

let n = 0;
const id = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;

// Générateur pseudo-aléatoire déterministe (mêmes données à chaque ouverture)
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

export function buildDemo() {
  n = 0;
  seed = 42;
  const household: Household = {
    id: H, name: "Guillaume & Emma", currency: "EUR", created_by: DEMO_G,
    split_settings: { mode: "equal_rate", incomes: { [DEMO_G]: 200600, [DEMO_E]: 100600 } },
  };
  const profiles: Profile[] = [
    { id: DEMO_G, first_name: "Guillaume", avatar_url: null, avatar_emoji: null, color: "#7DB0F7" },
    { id: DEMO_E, first_name: "Emma", avatar_url: null, avatar_emoji: null, color: "#F5A3C7" },
  ];
  const members: Member[] = [
    { household_id: H, user_id: DEMO_G, role: "owner", joined_at: "2026-01-01T10:00:00Z" },
    { household_id: H, user_id: DEMO_E, role: "member", joined_at: "2026-01-01T10:05:00Z" },
  ];

  const cat = (name: string, icon: string, color: string, kind: "expense" | "income", sort: number): Category => ({
    id: id(), household_id: H, name, icon, color, kind, is_system: true, archived: false, sort,
  });
  const categories = [
    cat("Courses", "shopping-cart", "#7FB89A", "expense", 1),
    cat("Restaurants", "utensils", "#FF9A80", "expense", 2),
    cat("Logement", "house", "#8B7FD1", "expense", 3),
    cat("Crédits", "credit-card", "#5FA8CF", "expense", 4),
    cat("Transport", "car", "#E8B04B", "expense", 5),
    cat("Bébé", "baby", "#EE97B9", "expense", 6),
    cat("Santé", "heart-pulse", "#E06C75", "expense", 7),
    cat("Shopping", "shopping-bag", "#B49CF0", "expense", 8),
    cat("Loisirs", "party-popper", "#6FC2B4", "expense", 9),
    cat("Abonnements", "repeat", "#9C8FE0", "expense", 10),
    cat("Impôts", "landmark", "#7D7A8C", "expense", 11),
    cat("Autres", "ellipsis", "#ABA4BF", "expense", 12),
    cat("Salaire", "briefcase", "#5FB383", "income", 1),
    cat("Remboursement", "rotate-ccw", "#5FA8CF", "income", 2),
    cat("Autres revenus", "sparkles", "#E8B04B", "income", 3),
  ];
  const C = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  const acc = (name: string, type: Account["type"], owner: string | null, initial: number, icon: string, color: string, sort: number, manual: number | null = null): Account => ({
    id: id(), household_id: H, name, type, owner_id: owner, initial_balance_cents: initial, icon, color,
    is_private: false, archived: false, sort, balance_cents: 0, manual_value_cents: manual, value_updated_at: manual ? new Date().toISOString() : null,
  });
  const accounts = [
    acc("Compte Guillaume", "courant", DEMO_G, 42000, "user", "#7DB0F7", 1),
    acc("Compte Emma", "courant", DEMO_E, 9000, "user", "#F5A3C7", 2),
    acc("Compte joint", "joint", null, 30000, "users", "#C5B6F2", 3),
    acc("Trade Republic Guillaume", "epargne", DEMO_G, 0, "landmark", "#7DB0F7", 4),
    acc("Trade Republic Emma", "epargne", DEMO_E, 0, "landmark", "#F5A3C7", 5, 135000),
    acc("Espèces", "especes", null, 6000, "banknote", "#E8B04B", 6),
  ];
  const [aG, aE, aJ, aTRG, aTRE, aCash] = accounts.map((a) => a.id);

  const holdings: Holding[] = [
    ["iShares Core MSCI World", "IE00B4L5Y983", 58.4, 582000, 520000],
    ["Amundi S&P 500", "LU1681048804", 21.7, 234000, 205000],
    ["Invesco Nasdaq-100", "IE00BMFKG444", 9.2, 110500, 98000],
  ].map(([name, ticker, q, v, inv], i) => ({
    id: id(), household_id: H, account_id: aTRG, name: name as string, ticker: ticker as string, quantity: q as number,
    value_cents: v as number, invested_cents: inv as number, sort: i, updated_at: new Date().toISOString(),
  }));

  const now = new Date();
  const thisMonth = monthStart(now);
  const todayIso = toISODate(now);
  const R = (label: string, amount: number, cat: string, account: string, frequency: RecurringExpense["frequency"], day: number, who: string | null) =>
    ({ label, amount_cents: amount, category_id: C[cat], account_id: account, frequency, day_of_month: day, start_date: "2025-01-01", end_date: null, assigned_to: who, active: true });
  const recurring_expenses: RecurringExpense[] = [
    R("Loyer", 105000, "Logement", aJ, "monthly", 5, null),
    R("Électricité", 8400, "Logement", aJ, "monthly", 12, null),
    R("Eau", 6500, "Logement", aJ, "quarterly", 18, null),
    R("Assurance habitation", 2890, "Logement", aJ, "monthly", 8, null),
    R("Crédit auto", 32000, "Crédits", aG, "monthly", 10, DEMO_G),
    R("Internet", 3999, "Abonnements", aJ, "monthly", 15, null),
    R("Forfait Guillaume", 1999, "Abonnements", aG, "monthly", 22, DEMO_G),
    R("Forfait Emma", 1599, "Abonnements", aE, "monthly", 24, DEMO_E),
    R("Netflix", 1349, "Abonnements", aJ, "monthly", 27, null),
  ].map((r) => ({ ...r, id: id(), household_id: H }));

  const transactions: Transaction[] = [];
  const scheduled_transactions: ScheduledTransaction[] = [];
  const tx = (t: Partial<Transaction> & Pick<Transaction, "kind" | "amount_cents" | "account_id" | "occurred_on">) => {
    const row: Transaction = {
      id: id(), household_id: H, label: "", category_id: null, to_account_id: null, assigned_to: null,
      note: null, created_by: pick([DEMO_G, DEMO_E]), created_at: `${t.occurred_on}T12:00:00Z`, ...t,
    };
    transactions.push(row);
    return row;
  };

  for (let m = -6; m <= 0; m++) {
    const month = addMonths(thisMonth, m);
    const last = m === 0 ? now.getDate() : daysInMonth(month);
    const day = (d: number) => toISODate(new Date(month.getFullYear(), month.getMonth(), Math.min(d, last)));

    // Salaires et alimentation du compte joint (au prorata après crédit)
    tx({ kind: "income", amount_cents: 200600, label: "Salaire", category_id: C["Salaire"], account_id: aG, occurred_on: day(1), assigned_to: DEMO_G, created_by: DEMO_G });
    tx({ kind: "income", amount_cents: 100600, label: "Salaire", category_id: C["Salaire"], account_id: aE, occurred_on: day(1), assigned_to: DEMO_E, created_by: DEMO_E });
    tx({ kind: "transfer", amount_cents: 115000, label: "Part du joint", account_id: aG, to_account_id: aJ, occurred_on: day(2) });
    tx({ kind: "transfer", amount_cents: 69000, label: "Part du joint", account_id: aE, to_account_id: aJ, occurred_on: day(2) });
    if (last >= 3) {
      tx({ kind: "transfer", amount_cents: 20000, label: "Versement Trade Republic", account_id: aG, to_account_id: aTRG, occurred_on: day(3) });
      tx({ kind: "transfer", amount_cents: 3000, label: "Versement Trade Republic", account_id: aE, to_account_id: aTRE, occurred_on: day(3) });
    }

    // Charges fixes passées → réglées
    for (const r of recurring_expenses) {
      for (const due of dueDatesInMonth(r, month)) {
        if (due > todayIso) continue;
        const t = tx({ kind: "expense", amount_cents: r.amount_cents, label: r.label, category_id: r.category_id, account_id: r.account_id!, occurred_on: due, assigned_to: r.assigned_to });
        scheduled_transactions.push({ id: id(), household_id: H, recurring_expense_id: r.id, due_on: due, amount_cents: r.amount_cents, status: "paid", transaction_id: t.id });
      }
    }

    const scale = m === 0 ? last / daysInMonth(month) : 1;
    const times = (k: number) => Math.max(1, Math.round(k * scale));
    // Courses communes (animaux compris : le gros sac de croquettes d'Ohana)
    for (let i = 0; i < times(8); i++)
      tx({ kind: "expense", amount_cents: between(2500, 7500), label: pick(["Carrefour", "Lidl", "Marché", "Picard", "Biocoop"]), category_id: C["Courses"], account_id: aJ, occurred_on: day(between(1, last)) });
    if (last >= 6) tx({ kind: "expense", amount_cents: 4990, label: "Croquettes Ohana (gros sac)", category_id: C["Courses"], account_id: aJ, occurred_on: day(6) });
    if (last >= 14) tx({ kind: "expense", amount_cents: between(1200, 1800), label: "Litière Miel & Booh", category_id: C["Courses"], account_id: aJ, occurred_on: day(14) });
    // Restaurants : le poste à ralentir
    for (let i = 0; i < times(7); i++) {
      const who = pick([DEMO_G, DEMO_E, DEMO_E, DEMO_E, null]);
      tx({ kind: "expense", amount_cents: between(1800, 6500), label: pick(["Sushi Shop", "Big Mamma", "Brunch", "Deliveroo", "Uber Eats", "Burger"]), category_id: C["Restaurants"], account_id: who === DEMO_G ? aG : who === DEMO_E ? aE : aJ, occurred_on: day(between(1, last)), assigned_to: who });
    }
    // Personnel
    for (let i = 0; i < times(4); i++)
      tx({ kind: "expense", amount_cents: between(2000, 6000), label: pick(["Zara", "Sephora", "Vinted", "Amazon"]), category_id: C["Shopping"], account_id: aE, occurred_on: day(between(1, last)), assigned_to: DEMO_E });
    for (let i = 0; i < times(2); i++)
      tx({ kind: "expense", amount_cents: between(3000, 6000), label: pick(["Essence", "Péage", "Parking"]), category_id: C["Transport"], account_id: aG, occurred_on: day(between(1, last)), assigned_to: DEMO_G });
    for (let i = 0; i < times(2); i++)
      tx({ kind: "expense", amount_cents: between(1500, 4000), label: pick(["Cinéma", "Escalade", "Livres", "Jeu vidéo"]), category_id: C["Loisirs"], account_id: pick([aG, aE]), occurred_on: day(between(1, last)), assigned_to: pick([DEMO_G, DEMO_E]) });
    tx({ kind: "expense", amount_cents: between(3000, 9000), label: pick(["Body & pyjamas", "Biberons", "Échographie", "Poussette (acompte)"]), category_id: C["Bébé"], account_id: aJ, occurred_on: day(between(1, last)) });
    if (rnd() > 0.5) tx({ kind: "expense", amount_cents: between(1500, 4500), label: "Pharmacie", category_id: C["Santé"], account_id: aE, occurred_on: day(between(1, last)), assigned_to: DEMO_E });
    if (rnd() > 0.6) tx({ kind: "expense", amount_cents: 2000, label: "Retrait", category_id: C["Autres"], account_id: aCash, occurred_on: day(between(1, last)) });
  }
  // Fix assignments for transactions created on personal accounts
  for (const t of transactions) {
    if (t.kind === "transfer") continue;
    if (t.account_id === aE) t.created_by = DEMO_E;
    if (t.account_id === aG) t.created_by = DEMO_G;
  }
  transactions.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  const budgets: Budget[] = [
    ["Courses", 55000], ["Restaurants", 15000], ["Bébé", 20000], ["Loisirs", 12000], ["Shopping", 15000],
  ].map(([c, a]) => ({ id: id(), household_id: H, category_id: C[c as string], month: monthISO(addMonths(thisMonth, -6)), amount_cents: a as number, is_recurring: true }));

  const goal = (name: string, icon: string, color: string, target: number, date: string | null, owner: string | null): SavingsGoal => ({
    id: id(), household_id: H, name, icon, color, target_cents: target, target_date: date, owner_id: owner, account_id: null, archived: false, created_at: "2026-01-01T00:00:00Z",
  });
  const savings_goals = [
    goal("Arrivée du bébé", "baby", "#EE97B9", 300000, `${now.getFullYear() + 1}-04-01`, null),
    goal("Vacances", "plane", "#5FA8CF", 200000, `${now.getFullYear() + 1}-07-01`, null),
    goal("Tesla", "car", "#8B7FD1", 4500000, null, DEMO_G),
  ];
  const savings_contributions: SavingsContribution[] = [];
  savings_goals.forEach((g, gi) => {
    for (let m = -6; m <= 0; m++) {
      savings_contributions.push({
        id: id(), household_id: H, goal_id: g.id, amount_cents: [25000, 15000, 20000][gi] + between(-3000, 3000),
        contributed_on: toISODate(new Date(thisMonth.getFullYear(), thisMonth.getMonth() + m, 3)),
        user_id: g.owner_id ?? pick([DEMO_G, DEMO_E]), note: null,
      });
    }
  });

  return {
    household, profiles, members,
    data: { accounts, categories, transactions, budgets, recurring_expenses, scheduled_transactions, savings_goals, savings_contributions, holdings },
  };
}

/** Soldes calculés localement (équivalent de la vue account_balances). */
export function computeBalances(accounts: Account[], txs: Transaction[]): Account[] {
  return accounts.map((a) => {
    let b = a.initial_balance_cents;
    for (const t of txs) {
      if (t.account_id === a.id) b += t.kind === "income" ? t.amount_cents : -t.amount_cents;
      else if (t.kind === "transfer" && t.to_account_id === a.id) b += t.amount_cents;
    }
    return { ...a, balance_cents: b };
  });
}

// Identité de démo : localStorage si disponible, sinon mémoire (navigateurs restreints)
let memoryUser: string | null = null;
export function getDemoUser() {
  try {
    return localStorage.getItem("tandem.demoUser") ?? memoryUser;
  } catch {
    return memoryUser;
  }
}
export function setDemoUser(id: string | null) {
  memoryUser = id;
  try {
    if (id) localStorage.setItem("tandem.demoUser", id);
    else localStorage.removeItem("tandem.demoUser");
  } catch {}
}

/** Confirmation avant suppression (les fenêtres natives sont bloquées dans certains cadres, d'où le contournement en démo). */
export function confirmAction(message: string) {
  if (IS_DEMO) return true;
  return window.confirm(message);
}
