/**
 * Mode démo : données fictives générées localement, sans Supabase.
 * Activé avec NEXT_PUBLIC_DEMO=1 (ou automatiquement si Supabase n'est pas configuré).
 */
import type {
  Account, Budget, Category, Household, Member, Profile, RecurringExpense, SavingsContribution,
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
  const household: Household = { id: H, name: "Guillaume & Emma", currency: "EUR", created_by: DEMO_G };
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
    cat("Transport", "car", "#E8B04B", "expense", 4),
    cat("Animaux", "paw-print", "#D98B5F", "expense", 5),
    cat("Bébé", "baby", "#EE97B9", "expense", 6),
    cat("Santé", "heart-pulse", "#E06C75", "expense", 7),
    cat("Shopping", "shopping-bag", "#B49CF0", "expense", 8),
    cat("Loisirs", "party-popper", "#5FA8CF", "expense", 9),
    cat("Abonnements", "repeat", "#9C8FE0", "expense", 10),
    cat("Impôts", "landmark", "#7D7A8C", "expense", 11),
    cat("Autres", "ellipsis", "#ABA4BF", "expense", 12),
    cat("Salaire", "briefcase", "#5FB383", "income", 1),
    cat("Remboursement", "rotate-ccw", "#5FA8CF", "income", 2),
    cat("Autres revenus", "sparkles", "#E8B04B", "income", 3),
  ];
  const C = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  const acc = (name: string, type: Account["type"], owner: string | null, initial: number, icon: string, color: string, sort: number, isPrivate = false): Account => ({
    id: id(), household_id: H, name, type, owner_id: owner, initial_balance_cents: initial, icon, color,
    is_private: isPrivate, archived: false, sort, balance_cents: 0,
  });
  const accounts = [
    acc("Compte Guillaume", "courant", DEMO_G, 64000, "user", "#7DB0F7", 1),
    acc("Compte Emma", "courant", DEMO_E, 52000, "user", "#F5A3C7", 2),
    acc("Compte joint", "joint", null, 38000, "users", "#251D40", 3),
    acc("Livret A", "epargne", null, 820000, "piggy-bank", "#7FB89A", 4),
    acc("Compte pro", "pro", DEMO_G, 95000, "briefcase", "#8B7FD1", 5),
    acc("Espèces", "especes", null, 8000, "banknote", "#E8B04B", 6),
  ];
  const [aG, aE, aJ, aL, aPro, aCash] = accounts.map((a) => a.id);

  const now = new Date();
  const thisMonth = monthStart(now);
  const todayIso = toISODate(now);
  const recurringBase: Omit<RecurringExpense, "id" | "household_id">[] = [
    { label: "Loyer", amount_cents: 105000, category_id: C["Logement"], account_id: aJ, frequency: "monthly", day_of_month: 5, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Électricité", amount_cents: 8400, category_id: C["Logement"], account_id: aJ, frequency: "monthly", day_of_month: 12, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Eau", amount_cents: 6500, category_id: C["Logement"], account_id: aJ, frequency: "quarterly", day_of_month: 18, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Assurance habitation", amount_cents: 2890, category_id: C["Logement"], account_id: aJ, frequency: "monthly", day_of_month: 8, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Crédit auto", amount_cents: 32000, category_id: C["Transport"], account_id: aG, frequency: "monthly", day_of_month: 10, start_date: "2025-01-01", end_date: null, assigned_to: DEMO_G, active: true },
    { label: "Internet", amount_cents: 3999, category_id: C["Abonnements"], account_id: aJ, frequency: "monthly", day_of_month: 15, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Forfait Guillaume", amount_cents: 1999, category_id: C["Abonnements"], account_id: aG, frequency: "monthly", day_of_month: 22, start_date: "2025-01-01", end_date: null, assigned_to: DEMO_G, active: true },
    { label: "Forfait Emma", amount_cents: 1599, category_id: C["Abonnements"], account_id: aE, frequency: "monthly", day_of_month: 24, start_date: "2025-01-01", end_date: null, assigned_to: DEMO_E, active: true },
    { label: "Netflix", amount_cents: 1349, category_id: C["Abonnements"], account_id: aJ, frequency: "monthly", day_of_month: 27, start_date: "2025-01-01", end_date: null, assigned_to: null, active: true },
    { label: "Mutuelle Ohana", amount_cents: 2490, category_id: C["Animaux"], account_id: aE, frequency: "monthly", day_of_month: 3, start_date: "2025-01-01", end_date: null, assigned_to: DEMO_E, active: true },
  ];
  const recurring_expenses: RecurringExpense[] = recurringBase.map((r) => ({ ...r, id: id(), household_id: H }));

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

  const shops = {
    Courses: ["Carrefour", "Monoprix", "Biocoop", "Marché", "Picard", "Lidl"],
    Restaurants: ["Sushi Shop", "Big Mamma", "Brunch du dimanche", "Boulangerie", "Deliveroo"],
    Transport: ["Essence", "Navigo", "Péage", "Uber", "Parking"],
    Animaux: ["Croquettes Ohana", "Litière Miel & Booh", "Vétérinaire", "Jouets Booh", "Nourriture Yasuo"],
    Bébé: ["Poussette", "Body & pyjamas", "Couches", "Échographie", "Biberons"],
    Santé: ["Pharmacie", "Ostéopathe", "Dentiste"],
    Shopping: ["Zara", "Fnac", "Amazon", "IKEA", "Sephora"],
    Loisirs: ["Cinéma", "Concert", "Salle d'escalade", "Livres", "Week-end"],
  } as const;

  for (let m = -6; m <= 0; m++) {
    const month = addMonths(thisMonth, m);
    const last = m === 0 ? now.getDate() : daysInMonth(month);
    const day = (d: number) => toISODate(new Date(month.getFullYear(), month.getMonth(), Math.min(d, last)));

    // Revenus
    if (last >= 1) {
      tx({ kind: "income", amount_cents: 248000, label: "Salaire", category_id: C["Salaire"], account_id: aG, occurred_on: day(1), assigned_to: DEMO_G });
      tx({ kind: "income", amount_cents: 212000, label: "Salaire", category_id: C["Salaire"], account_id: aE, occurred_on: day(1), assigned_to: DEMO_E });
      tx({ kind: "transfer", amount_cents: 90000, label: "Alimentation joint", account_id: aG, to_account_id: aJ, occurred_on: day(2) });
      tx({ kind: "transfer", amount_cents: 90000, label: "Alimentation joint", account_id: aE, to_account_id: aJ, occurred_on: day(2) });
    }
    if (last >= 20) {
      tx({ kind: "income", amount_cents: between(25000, 60000), label: "Facture client", category_id: C["Autres revenus"], account_id: aPro, occurred_on: day(between(15, 20)), assigned_to: DEMO_G });
      tx({ kind: "transfer", amount_cents: 30000, label: "Épargne du mois", account_id: aJ, to_account_id: aL, occurred_on: day(20) });
    }

    // Charges fixes du mois déjà passées → réglées
    for (const r of recurring_expenses) {
      for (const due of dueDatesInMonth(r, month)) {
        if (due > todayIso) continue;
        const t = tx({ kind: "expense", amount_cents: r.amount_cents, label: r.label, category_id: r.category_id, account_id: r.account_id!, occurred_on: due, assigned_to: r.assigned_to });
        scheduled_transactions.push({ id: id(), household_id: H, recurring_expense_id: r.id, due_on: due, amount_cents: r.amount_cents, status: "paid", transaction_id: t.id });
      }
    }

    // Dépenses variables
    const plan: [keyof typeof shops, number, number, number][] = [
      ["Courses", 10, 3000, 7800], ["Restaurants", 5, 2200, 4400], ["Transport", 3, 2000, 7000],
      ["Animaux", 3, 2000, 4500], ["Bébé", 2, 2500, 9000], ["Santé", 1, 1500, 6000],
      ["Shopping", 3, 3000, 12000], ["Loisirs", 3, 2500, 8000],
    ];
    for (const [c, count, min, max] of plan) {
      const k = m === 0 ? Math.max(1, Math.round((count * last) / daysInMonth(month))) : count;
      for (let i = 0; i < k; i++) {
        const who = pick([DEMO_G, DEMO_E, null, null]);
        tx({
          kind: "expense",
          amount_cents: between(min, max),
          label: pick(shops[c]),
          category_id: C[c],
          account_id: who === DEMO_G ? aG : who === DEMO_E ? aE : rnd() > 0.9 ? aCash : aJ,
          occurred_on: day(between(1, last)),
          assigned_to: who,
        });
      }
    }
  }
  transactions.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  const budgets: Budget[] = [
    ["Courses", 50000], ["Restaurants", 15000], ["Animaux", 10000], ["Bébé", 20000], ["Loisirs", 15000], ["Shopping", 20000],
  ].map(([c, a]) => ({ id: id(), household_id: H, category_id: C[c as string], month: monthISO(addMonths(thisMonth, -6)), amount_cents: a as number, is_recurring: true }));

  const goal = (name: string, icon: string, color: string, target: number, date: string | null, owner: string | null): SavingsGoal => ({
    id: id(), household_id: H, name, icon, color, target_cents: target, target_date: date, owner_id: owner, account_id: aL, archived: false, created_at: "2026-01-01T00:00:00Z",
  });
  const savings_goals = [
    goal("Arrivée du bébé", "baby", "#EE97B9", 500000, `${now.getFullYear() + 1}-04-01`, null),
    goal("Vacances", "plane", "#5FA8CF", 300000, `${now.getFullYear() + 1}-07-01`, null),
    goal("Tesla", "car", "#8B7FD1", 4500000, null, DEMO_G),
    goal("Achat immobilier", "house", "#7FB89A", 6000000, `${now.getFullYear() + 3}-01-01`, null),
  ];
  const savings_contributions: SavingsContribution[] = [];
  savings_goals.forEach((g, gi) => {
    for (let m = -6; m <= 0; m++) {
      const amount = [42000, 25000, 60000, 80000][gi] + between(-5000, 5000);
      savings_contributions.push({
        id: id(), household_id: H, goal_id: g.id, amount_cents: amount,
        contributed_on: toISODate(new Date(thisMonth.getFullYear(), thisMonth.getMonth() + m, 3)),
        user_id: pick([DEMO_G, DEMO_E]), note: null,
      });
    }
  });

  return {
    household, profiles, members,
    data: { accounts, categories, transactions, budgets, recurring_expenses, scheduled_transactions, savings_goals, savings_contributions },
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
