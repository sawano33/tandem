export type UUID = string;

export type Profile = {
  id: UUID;
  first_name: string;
  avatar_url: string | null;
  avatar_emoji: string | null;
  color: string;
  notification_prefs?: NotificationPrefs | null;
};

export type NotificationPrefs = {
  enabled: boolean;
  budget_warn: boolean; // budget à 80 %
  budget_over: boolean; // budget dépassé
  charges: boolean; // charges fixes à venir
  charges_days: number; // combien de jours avant
  partner: boolean; // dépense ajoutée par le partenaire
  partner_min_cents: number; // seulement au-delà de ce montant
  weekly: boolean; // récap du dimanche soir
  goals: boolean; // objectif d'épargne atteint
  quiet: boolean; // pas de notification la nuit (22 h – 8 h)
};

export const DEFAULT_NOTIF: NotificationPrefs = {
  enabled: true, budget_warn: true, budget_over: true, charges: true, charges_days: 2,
  partner: true, partner_min_cents: 0, weekly: true, goals: true, quiet: true,
};

export type SplitMode = "equal" | "prorata" | "prorata_after_credits" | "equal_rate" | "custom";
export type SplitSettings = {
  mode: SplitMode;
  /** revenus nets mensuels par membre, en centimes */
  incomes?: Record<UUID, number>;
  /** part personnalisée en % par membre */
  custom?: Record<UUID, number>;
};

export type Household = {
  id: UUID;
  name: string;
  currency: string;
  created_by: UUID | null;
  split_settings?: SplitSettings | null;
};

export type Member = { household_id: UUID; user_id: UUID; role: "owner" | "member"; joined_at: string };

export type AccountType = "courant" | "joint" | "epargne" | "pro" | "especes";

export type Account = {
  id: UUID;
  household_id: UUID;
  name: string;
  type: AccountType;
  owner_id: UUID | null;
  initial_balance_cents: number;
  icon: string;
  color: string;
  is_private: boolean;
  archived: boolean;
  sort: number;
  /** comptes d'investissement : valeur globale saisie à la main */
  manual_value_cents?: number | null;
  value_updated_at?: string | null;
  /** calculé via la vue account_balances */
  balance_cents: number;
};

export type Holding = {
  id: UUID;
  household_id: UUID;
  account_id: UUID;
  name: string;
  ticker: string | null;
  quantity: number | null;
  value_cents: number;
  invested_cents: number | null;
  sort: number;
  updated_at: string;
};

export type Category = {
  id: UUID;
  household_id: UUID;
  name: string;
  icon: string;
  color: string;
  kind: "expense" | "income";
  is_system: boolean;
  archived: boolean;
  sort: number;
};

export type TxKind = "expense" | "income" | "transfer";

export type Transaction = {
  id: UUID;
  household_id: UUID;
  kind: TxKind;
  amount_cents: number;
  label: string;
  category_id: UUID | null;
  account_id: UUID;
  to_account_id: UUID | null;
  occurred_on: string; // YYYY-MM-DD
  assigned_to: UUID | null; // null = commun
  note: string | null;
  created_by: UUID | null;
  created_at: string;
};

export type Budget = {
  id: UUID;
  household_id: UUID;
  category_id: UUID;
  month: string; // YYYY-MM-01
  amount_cents: number;
  is_recurring: boolean;
};

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

export type RecurringExpense = {
  id: UUID;
  household_id: UUID;
  label: string;
  amount_cents: number;
  category_id: UUID | null;
  account_id: UUID | null;
  frequency: Frequency;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  assigned_to: UUID | null;
  active: boolean;
};

export type ScheduledTransaction = {
  id: UUID;
  household_id: UUID;
  recurring_expense_id: UUID;
  due_on: string;
  amount_cents: number;
  status: "paid" | "skipped";
  transaction_id: UUID | null;
};

export type SavingsGoal = {
  id: UUID;
  household_id: UUID;
  name: string;
  icon: string;
  color: string;
  target_cents: number;
  target_date: string | null;
  owner_id: UUID | null;
  account_id: UUID | null;
  archived: boolean;
  created_at: string;
};

export type SavingsContribution = {
  id: UUID;
  household_id: UUID;
  goal_id: UUID;
  amount_cents: number;
  contributed_on: string;
  user_id: UUID | null;
  note: string | null;
};

/** "all" = Ensemble, sinon l'identifiant d'un membre */
export type Scope = "all" | UUID;
