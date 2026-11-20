"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase/client";
import { money, monthStart } from "./format";
import { allowed, notify } from "./notify";
import { DEFAULT_NOTIF } from "./types";
import { IS_DEMO, buildDemo, computeBalances, getDemoUser, setDemoUser } from "./demo";
import type {
  Account, Budget, Category, Household, Member, Profile, RecurringExpense, SavingsContribution,
  SavingsGoal, ScheduledTransaction, Scope, Transaction, Holding,
} from "./types";

type Tables = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring_expenses: RecurringExpense[];
  scheduled_transactions: ScheduledTransaction[];
  savings_goals: SavingsGoal[];
  savings_contributions: SavingsContribution[];
  holdings: Holding[];
};
type TableName = keyof Tables | "account_balances";

type Toast = { id: number; text: string; tone?: "default" | "warn" | "error" };

type Ctx = Tables & {
  ready: boolean;
  user: User | null;
  household: Household | null;
  members: (Member & { profile: Profile | undefined })[];
  profiles: Profile[];
  me: Profile | undefined;
  partner: Profile | undefined;
  scope: Scope;
  setScope: (s: Scope) => void;
  month: Date;
  setMonth: (d: Date) => void;
  nameOf: (userId: string | null) => string;
  // écritures
  insert: <T extends keyof Tables>(table: T, row: Record<string, unknown>) => Promise<Tables[T][number] | null>;
  update: <T extends keyof Tables>(table: T, id: string, patch: Record<string, unknown>) => Promise<boolean>;
  remove: <T extends keyof Tables>(table: T, id: string) => Promise<boolean>;
  reload: (...tables: TableName[]) => Promise<void>;
  reloadProfiles: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  updateHousehold: (patch: Partial<Household>) => Promise<boolean>;
  createInvitation: () => Promise<string | null>;
  signOut: () => Promise<void>;
  demo: boolean;
  // ajout rapide
  sheet: SheetState;
  openSheet: (s?: Partial<SheetState>) => void;
  closeSheet: () => void;
  // notifications in-app
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
};

export type SheetState = {
  open: boolean;
  editing?: Transaction;
  kind?: Transaction["kind"];
  /** préremplissage depuis une charge fixe */
  charge?: { recurring_id: string; due_on: string };
  preset?: Partial<Transaction>;
};

const DataContext = createContext<Ctx | null>(null);

export const useData = () => {
  const c = useContext(DataContext);
  if (!c) throw new Error("useData hors DataProvider");
  return c;
};

const ORDER: Record<keyof Tables, string> = {
  accounts: "sort",
  categories: "sort",
  transactions: "occurred_on",
  budgets: "month",
  recurring_expenses: "day_of_month",
  scheduled_transactions: "due_on",
  savings_goals: "created_at",
  savings_contributions: "contributed_on",
  holdings: "sort",
};

const EMPTY: Tables = {
  accounts: [], categories: [], transactions: [], budgets: [], recurring_expenses: [],
  scheduled_transactions: [], savings_goals: [], savings_contributions: [], holdings: [],
};

export function DataProvider({ children }: { children: ReactNode }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [data, setData] = useState<Tables>(EMPTY);
  const [ready, setReady] = useState(false);
  const [scope, setScopeState] = useState<Scope>("all");
  const [month, setMonth] = useState<Date>(() => monthStart(new Date()));
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hid = useRef<string | null>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /** Charge une table entière (pagination par 1000 pour conserver tout l'historique). */
  const fetchTable = useCallback(
    async <T extends keyof Tables>(table: T): Promise<Tables[T]> => {
      const out: unknown[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: rows, error } = await supabase
          .from(table)
          .select("*")
          .eq("household_id", hid.current!)
          .order(ORDER[table], { ascending: table !== "transactions" })
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        out.push(...(rows ?? []));
        if (!rows || rows.length < 1000) break;
      }
      return out as Tables[T];
    },
    [supabase],
  );

  const fetchAccounts = useCallback(async () => {
    const [acc, bal] = await Promise.all([
      fetchTable("accounts"),
      supabase.from("account_balances").select("account_id, balance_cents").eq("household_id", hid.current!),
    ]);
    const map = new Map<string, number>((bal.data ?? []).map((b: { account_id: string; balance_cents: number }) => [b.account_id, Number(b.balance_cents)]));
    return acc.map((a) => ({
      ...a,
      manual_value_cents: a.manual_value_cents == null ? null : Number(a.manual_value_cents),
      initial_balance_cents: Number(a.initial_balance_cents),
      balance_cents: map.get(a.id) ?? Number(a.initial_balance_cents),
    }));
  }, [fetchTable, supabase]);

  const reload = useCallback(
    async (...tables: TableName[]) => {
      if (IS_DEMO || !hid.current) return;
      const list = new Set<TableName>(tables.length ? tables : (Object.keys(EMPTY) as TableName[]));
      // tout mouvement d'argent change les soldes
      if (list.has("transactions") || list.has("account_balances")) list.add("accounts");
      list.delete("account_balances");
      try {
        const entries = await Promise.all(
          [...list].map(async (t) => [t, t === "accounts" ? await fetchAccounts() : await fetchTable(t as keyof Tables)] as const),
        );
        setData((d) => {
          const next = { ...d };
          for (const [t, rows] of entries) {
            (next as Record<string, unknown>)[t] = (rows as Record<string, unknown>[]).map((r) =>
              "amount_cents" in r ? { ...r, amount_cents: Number(r.amount_cents) } : "target_cents" in r ? { ...r, target_cents: Number(r.target_cents) } : "value_cents" in r ? { ...r, value_cents: Number(r.value_cents), quantity: r.quantity == null ? null : Number(r.quantity) } : r,
            );
          }
          return next;
        });
      } catch (e) {
        console.error(e);
        toast("Synchronisation impossible. Vérifiez votre connexion.", "error");
      }
    },
    [fetchAccounts, fetchTable, toast],
  );

  const reloadProfiles = useCallback(async () => {
    if (!hid.current) return;
    const { data: m } = await supabase.from("household_members").select("*").eq("household_id", hid.current);
    const ids = (m ?? []).map((x: Member) => x.user_id);
    const { data: p } = await supabase.from("profiles").select("*").in("id", ids);
    setMembers((m ?? []) as Member[]);
    setProfiles((p ?? []) as Profile[]);
  }, [supabase]);

  // Chargement initial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (IS_DEMO) {
        const who = getDemoUser();
        if (!who) {
          router.replace("/login");
          return;
        }
        const demo = buildDemo();
        setUser({ id: who } as User);
        setHousehold(demo.household);
        setMembers(demo.members);
        setProfiles(demo.profiles);
        setData(demo.data);
        try {
          const saved = localStorage.getItem("tandem.scope");
          if (saved) setScopeState(saved);
        } catch {}
        setReady(true);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      setUser(auth.user);
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(*)")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!membership) {
        router.replace("/onboarding");
        return;
      }
      hid.current = membership.household_id;
      setHousehold(membership.households as unknown as Household);
      try {
        const saved = localStorage.getItem("tandem.scope");
        if (saved) setScopeState(saved);
      } catch {}
      await Promise.all([reloadProfiles(), reload()]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, reload, reloadProfiles]);

  // Synchronisation temps réel : quand l'un ajoute, l'autre voit immédiatement.
  useEffect(() => {
    if (IS_DEMO || !ready || !hid.current) return;
    const pending = new Set<TableName>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (t: TableName) => {
      pending.add(t);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const list = [...pending];
        pending.clear();
        reload(...list);
      }, 250);
    };
    const channel = supabase.channel(`household:${hid.current}`);
    (Object.keys(EMPTY) as (keyof Tables)[]).forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${hid.current}` },
        () => schedule(table),
      );
    });
    // Notification quand le partenaire ajoute une dépense
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "transactions", filter: `household_id=eq.${hid.current}` },
      (payload: { new: unknown }) => {
        const t = payload.new as Transaction;
        const prefs = { ...DEFAULT_NOTIF, ...(meRef.current?.notification_prefs ?? {}) };
        if (t.created_by && t.created_by !== userRef.current && t.kind === "expense" && allowed(prefs, "partner") && t.amount_cents >= prefs.partner_min_cents) {
          notify(`${nameRef.current(t.created_by)} : ${money(Number(t.amount_cents))}`, t.label || "Nouvelle dépense", `tx-${t.id}`);
        }
      },
    );
    channel.on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: `household_id=eq.${hid.current}` }, () => reloadProfiles());
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => reloadProfiles());
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${hid.current}` }, (p: { new: unknown }) =>
      setHousehold(p.new as Household),
    );
    channel.subscribe();

    // Rattrapage au retour au premier plan (iOS suspend les connexions en arrière-plan)
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [ready, supabase, reload, reloadProfiles]);

  const setScope = useCallback((s: Scope) => {
    setScopeState(s);
    try {
      localStorage.setItem("tandem.scope", s);
    } catch {}
  }, []);

  const insert: Ctx["insert"] = useCallback(
    async (table, row) => {
      if (IS_DEMO) {
        const created = { id: crypto.randomUUID(), household_id: "demo", created_at: new Date().toISOString(), created_by: user?.id ?? null, ...row } as never;
        setData((d) => {
          const rows = [...(d[table] as unknown[]), created] as { occurred_on?: string }[];
          if (table === "transactions") rows.sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));
          return { ...d, [table]: rows };
        });
        return created;
      }
      const { data: created, error } = await supabase
        .from(table)
        .insert({ household_id: hid.current, ...row })
        .select()
        .single();
      if (error) {
        console.error(error);
        toast(friendlyError(error.message), "error");
        return null;
      }
      await reload(table);
      return created;
    },
    [supabase, reload, toast, user],
  );

  const update: Ctx["update"] = useCallback(
    async (table, id, patch) => {
      if (IS_DEMO) {
        setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        return true;
      }
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) {
        toast(friendlyError(error.message), "error");
        return false;
      }
      await reload(table);
      return true;
    },
    [supabase, reload, toast],
  );

  const remove: Ctx["remove"] = useCallback(
    async (table, id) => {
      if (IS_DEMO) {
        setData((d) => {
          const next = { ...d, [table]: (d[table] as { id: string }[]).filter((r) => r.id !== id) } as Tables;
          if (table === "transactions") next.scheduled_transactions = d.scheduled_transactions.filter((x) => x.transaction_id !== id);
          if (table === "savings_goals") next.savings_contributions = d.savings_contributions.filter((x) => x.goal_id !== id);
          if (table === "recurring_expenses") next.scheduled_transactions = d.scheduled_transactions.filter((x) => x.recurring_expense_id !== id);
          return next;
        });
        return true;
      }
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        toast(friendlyError(error.message), "error");
        return false;
      }
      await reload(table, ...(table === "transactions" ? (["scheduled_transactions"] as TableName[]) : []));
      return true;
    },
    [supabase, reload, toast],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return false;
      if (!IS_DEMO) {
        const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
        if (error) {
          toast(friendlyError(error.message), "error");
          return false;
        }
      }
      setProfiles((ps) => ps.map((p) => (p.id === user.id ? { ...p, ...patch } : p)));
      return true;
    },
    [supabase, user, toast],
  );

  const updateHousehold = useCallback(
    async (patch: Partial<Household>) => {
      if (!household) return false;
      if (!IS_DEMO) {
        const { error } = await supabase.from("households").update(patch).eq("id", household.id);
        if (error) {
          toast(friendlyError(error.message), "error");
          return false;
        }
      }
      setHousehold({ ...household, ...patch });
      return true;
    },
    [supabase, household, toast],
  );

  const createInvitation = useCallback(async () => {
    if (IS_DEMO) return "DEMO42";
    const { data: code, error } = await supabase.rpc("create_invitation");
    if (error) {
      toast(friendlyError(error.message), "error");
      return null;
    }
    return code as string;
  }, [supabase, toast]);

  const signOut = useCallback(async () => {
    if (IS_DEMO) {
      setDemoUser(null);
    } else await supabase.auth.signOut();
    router.replace("/login");
  }, [supabase, router]);

  // Comptes d'investissement : valeur = somme des lignes, sinon valeur globale saisie, sinon solde calculé
  const accountsWithBalance = useMemo(() => {
    const base = IS_DEMO ? computeBalances(data.accounts, data.transactions) : data.accounts;
    return base.map((a) => {
      if (a.type !== "epargne") return a;
      const lines = data.holdings.filter((h) => h.account_id === a.id);
      if (lines.length) return { ...a, balance_cents: lines.reduce((s, h) => s + h.value_cents, 0) };
      if (a.manual_value_cents != null) return { ...a, balance_cents: a.manual_value_cents };
      return a;
    });
  }, [data.accounts, data.transactions, data.holdings]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const me = user ? profileMap.get(user.id) : undefined;
  const partner = profiles.find((p) => p.id !== user?.id && members.some((m) => m.user_id === p.id));
  const nameOf = useCallback(
    (id: string | null) => (id ? profileMap.get(id)?.first_name || "Partenaire" : "Commun"),
    [profileMap],
  );

  const meRef = useRef(me);
  const userRef = useRef(user?.id);
  const nameRef = useRef(nameOf);
  meRef.current = me;
  userRef.current = user?.id;
  nameRef.current = nameOf;

  const value: Ctx = {
    ...data,
    accounts: accountsWithBalance,
    ready,
    demo: IS_DEMO,
    updateProfile,
    updateHousehold,
    createInvitation,
    signOut,
    user,
    household,
    members: members
      .map((m) => ({ ...m, profile: profileMap.get(m.user_id) }))
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    profiles,
    me,
    partner,
    scope: scope !== "all" && !members.some((m) => m.user_id === scope) && ready ? "all" : scope,
    setScope,
    month,
    setMonth,
    nameOf,
    insert,
    update,
    remove,
    reload,
    reloadProfiles,
    sheet,
    openSheet: (s) => setSheet({ ...s, open: true }),
    closeSheet: () => setSheet((s) => ({ ...s, open: false })),
    toasts,
    toast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function friendlyError(msg: string) {
  if (/row-level security/i.test(msg)) return "Action non autorisée pour ce compte.";
  if (/foreign key|violates.*restrict/i.test(msg)) return "Élément encore utilisé par des opérations.";
  if (/duplicate key/i.test(msg)) return "Cet élément existe déjà.";
  if (/fetch|network/i.test(msg)) return "Connexion impossible. Réessayez.";
  return msg;
}
