"use client";

import { confirmAction } from "@/lib/demo";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartPie, PiggyBank, Plus } from "lucide-react";
import { useData } from "@/lib/store";
import { centsToInput, dayShort, money, monthISO, monthLabel, parseAmount, parseISODate, pct, today } from "@/lib/format";
import { budgetLines, goalInScope, goalSaved, type BudgetLine } from "@/lib/finance";
import { Icon, IconBubble, PALETTE } from "@/lib/icons";
import { IconColorPicker } from "@/components/IconColorPicker";
import type { SavingsGoal } from "@/lib/types";
import { MonthSwitcher, ScopeSwitcher } from "@/components/Switchers";
import { Button, Card, Chip, EmptyState, Field, Page, PageHeader, Progress, Segmented, Sheet, Toggle, cx, inputClass } from "@/components/ui";

export default function BudgetsPage() {
  return (
    <Suspense>
      <BudgetsInner />
    </Suspense>
  );
}

function BudgetsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const view = params.get("vue") === "epargne" ? "epargne" : "budgets";
  const [adding, setAdding] = useState(false);

  return (
    <Page>
      <PageHeader
        title={view === "budgets" ? "Budgets" : "Épargne"}
        right={
          <button onClick={() => setAdding(true)} aria-label="Ajouter" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
            <Plus size={22} />
          </button>
        }
      />
      <Segmented
        value={view}
        onChange={(v) => router.replace(v === "epargne" ? "/budgets?vue=epargne" : "/budgets")}
        options={[
          { value: "budgets", label: "Budgets" },
          { value: "epargne", label: "Épargne & projets" },
        ]}
      />
      {view === "budgets" ? <BudgetsView adding={adding} setAdding={setAdding} /> : <SavingsView adding={adding} setAdding={setAdding} />}
    </Page>
  );
}

// =================================================================== Budgets
function BudgetsView({ adding, setAdding }: { adding: boolean; setAdding: (v: boolean) => void }) {
  const d = useData();
  const lines = budgetLines(d.budgets, d.categories, d.transactions, d.month);
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const total = lines.reduce((s, l) => s + l.budget.amount_cents, 0);
  const spent = lines.reduce((s, l) => s + l.spent, 0);

  return (
    <>
      <MonthSwitcher className="mt-4" />
      {lines.length === 0 ? (
        <EmptyState
          icon={<ChartPie size={24} />}
          title="Aucun budget"
          text="Fixez un plafond par catégorie : Courses 500 €, Restaurants 150 €…"
          action={<Button onClick={() => setAdding(true)}>Créer un budget</Button>}
        />
      ) : (
        <>
          <Card className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="font-display tabular text-[28px] font-semibold text-ink">{money(total - spent)}</p>
              <p className="text-sm text-muted">{pct(spent, total)} % utilisé</p>
            </div>
            <p className="text-[13px] text-muted">restants sur {money(total)} budgétés</p>
            <Progress ratio={total ? spent / total : 0} className="mt-3" />
          </Card>
          <div className="mt-4 space-y-3">
            {lines.map((l) => (
              <Card key={l.budget.id} onClick={() => setEditing(l)}>
                <div className="flex items-center gap-3">
                  <IconBubble name={l.category!.icon} color={l.category!.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{l.category!.name}</p>
                    <p className="tabular text-[13px] text-muted">
                      {money(l.spent)} / {money(l.budget.amount_cents)}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "tabular text-sm font-semibold",
                      l.level === "over" ? "text-over" : l.level === "warn" ? "text-warn" : "text-ink",
                    )}
                  >
                    {Math.round(l.ratio * 100)} %
                  </span>
                </div>
                <Progress ratio={l.ratio} color={l.category!.color} className="mt-3" />
                <p className={cx("mt-1.5 text-[12px]", l.remaining < 0 ? "font-medium text-over" : "text-muted")}>
                  {l.remaining >= 0 ? `Reste ${money(l.remaining)}` : `Dépassé de ${money(-l.remaining)}`}
                  {l.budget.is_recurring && " · reconduit chaque mois"}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
      <BudgetSheet open={adding || !!editing} line={editing} onClose={() => { setAdding(false); setEditing(null); }} />
    </>
  );
}

function BudgetSheet({ open, line, onClose }: { open: boolean; line: BudgetLine | null; onClose: () => void }) {
  const d = useData();
  const iso = monthISO(d.month);
  const [catId, setCatId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [key, setKey] = useState("");

  const openKey = `${open}-${line?.budget.id ?? "new"}`;
  if (open && key !== openKey) {
    setKey(openKey);
    setCatId(line?.budget.category_id ?? null);
    setAmount(line ? centsToInput(line.budget.amount_cents) : "");
    setRecurring(line?.budget.is_recurring ?? true);
  }
  if (!open && key) setKey("");

  const used = new Set(budgetLines(d.budgets, d.categories, d.transactions, d.month).map((l) => l.budget.category_id));
  const cats = d.categories.filter((c) => c.kind === "expense" && !c.archived && (!used.has(c.id) || c.id === line?.budget.category_id));
  const cents = parseAmount(amount);

  async function save() {
    if (!cents || !catId) return;
    const row = { category_id: catId, amount_cents: cents, is_recurring: recurring, month: iso };
    let ok;
    if (line && line.budget.month === iso) ok = await d.update("budgets", line.budget.id, row);
    else ok = !!(await d.insert("budgets", row)); // nouveau montant à partir de ce mois
    if (ok) {
      d.toast("Budget enregistré");
      onClose();
    }
  }

  async function del() {
    if (!line) return;
    if (line.budget.month === iso) await d.remove("budgets", line.budget.id);
    else await d.update("budgets", line.budget.id, { is_recurring: false }); // arrête la reconduction
    d.toast("Budget supprimé");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={line ? `Budget ${line.category?.name}` : "Nouveau budget"}
      footer={
        <div className="flex gap-2">
          {line && <Button variant="danger" className="w-auto" onClick={del}>Supprimer</Button>}
          <Button onClick={save} disabled={!cents || !catId}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Montant maximum par mois">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="500" className={inputClass} />
        </Field>
        {!line && (
          <div>
            <p className="mb-2 px-1 text-[13px] font-medium text-muted">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Chip key={c.id} active={catId === c.id} color={c.color} onClick={() => setCatId(c.id)}>
                  <Icon name={c.icon} size={16} /> {c.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <Card>
          <Toggle checked={recurring} onChange={setRecurring} label="Reconduire automatiquement chaque mois" />
        </Card>
        <p className="px-1 text-xs text-muted">
          S&apos;applique à partir de {monthLabel(d.month).toLowerCase()}. Vous serez prévenus à 80 % et en cas de dépassement.
        </p>
      </div>
    </Sheet>
  );
}

// =================================================================== Épargne
function SavingsView({ adding, setAdding }: { adding: boolean; setAdding: (v: boolean) => void }) {
  const d = useData();
  const [selected, setSelected] = useState<SavingsGoal | null>(null);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const goals = d.savings_goals.filter((g) => !g.archived && goalInScope(g, d.scope));
  const saved = goals.reduce((s, g) => s + goalSaved(g, d.savings_contributions), 0);
  const target = goals.reduce((s, g) => s + g.target_cents, 0);

  return (
    <>
      <ScopeSwitcher className="mt-3" />
      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={24} />}
          title="Aucun projet"
          text="Tesla, arrivée du bébé, vacances, achat immobilier… Créez votre premier objectif."
          action={<Button onClick={() => setAdding(true)}>Créer un objectif</Button>}
        />
      ) : (
        <>
          <Card className="mt-4">
            <p className="text-[13px] text-muted">Total épargné</p>
            <p className="font-display tabular text-[28px] font-semibold text-ink">{money(saved)}</p>
            <Progress ratio={target ? saved / target : 0} className="mt-2" />
            <p className="mt-1.5 text-[12px] text-muted">{pct(saved, target)} % de {money(target)}</p>
          </Card>
          <div className="mt-4 space-y-3">
            {goals.map((g) => {
              const sv = goalSaved(g, d.savings_contributions);
              return (
                <Card key={g.id} onClick={() => setSelected(g)}>
                  <div className="flex items-center gap-3">
                    <IconBubble name={g.icon} color={g.color} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold text-ink">{g.name}</p>
                      <p className="text-[13px] text-muted">
                        {g.owner_id ? d.nameOf(g.owner_id) : "Commun"}
                        {g.target_date && ` · ${dayShort(g.target_date)} ${g.target_date.slice(0, 4)}`}
                      </p>
                    </div>
                    <span className="font-display tabular text-lg font-semibold text-ink">{pct(sv, g.target_cents)} %</span>
                  </div>
                  <Progress ratio={sv / g.target_cents} color={g.color} className="mt-3" />
                  <div className="mt-1.5 flex justify-between text-[12px] text-muted">
                    <span className="tabular">{money(sv)} / {money(g.target_cents)}</span>
                    <span className="tabular">Reste {money(Math.max(0, g.target_cents - sv))}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      <GoalSheet
        open={adding || !!editing}
        goal={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <GoalDetail
        goal={selected}
        onClose={() => setSelected(null)}
        onEdit={(g) => {
          setSelected(null);
          setEditing(g);
        }}
      />
    </>
  );
}

function GoalDetail({ goal, onClose, onEdit }: { goal: SavingsGoal | null; onClose: () => void; onEdit: (g: SavingsGoal) => void }) {
  const d = useData();
  const [amount, setAmount] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const g = goal ? d.savings_goals.find((x) => x.id === goal.id) ?? goal : null;
  const list = useMemo(
    () => (g ? d.savings_contributions.filter((c) => c.goal_id === g.id).sort((a, b) => b.contributed_on.localeCompare(a.contributed_on)) : []),
    [d.savings_contributions, g],
  );
  if (!g) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const sv = goalSaved(g, d.savings_contributions);
  const remaining = Math.max(0, g.target_cents - sv);
  let perMonth: number | null = null;
  if (g.target_date && remaining > 0) {
    const t = parseISODate(g.target_date);
    const n = new Date();
    const months = (t.getFullYear() - n.getFullYear()) * 12 + t.getMonth() - n.getMonth();
    perMonth = months > 0 ? Math.ceil(remaining / months) : remaining;
  }
  const cents = parseAmount(amount);

  async function add() {
    if (!cents) return;
    const ok = await d.insert("savings_contributions", {
      goal_id: g!.id,
      amount_cents: withdraw ? -cents : cents,
      contributed_on: today(),
      user_id: d.user?.id,
    });
    if (ok) {
      setAmount("");
      d.toast(withdraw ? "Retrait enregistré" : `+${money(cents)} pour ${g!.name}`);
    }
  }

  return (
    <Sheet open={!!goal} onClose={onClose} title={g.name}>
      <div className="flex flex-col items-center text-center">
        <IconBubble name={g.icon} color={g.color} size={64} />
        <p className="font-display tabular mt-3 text-[34px] font-semibold text-ink">{money(sv)}</p>
        <p className="text-sm text-muted">sur {money(g.target_cents)} · {pct(sv, g.target_cents)} %</p>
        <Progress ratio={sv / g.target_cents} color={g.color} className="mt-3" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[12px] text-muted">Reste à épargner</p>
          <p className="tabular font-semibold text-ink">{money(remaining)}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-muted">{perMonth ? "Par mois pour tenir" : "Date cible"}</p>
          <p className="tabular font-semibold text-ink">{perMonth ? money(perMonth) : g.target_date ? dayShort(g.target_date) : "—"}</p>
        </Card>
      </div>

      <div className="mt-5 rounded-[22px] bg-surface p-4">
        <Segmented
          value={withdraw ? "out" : "in"}
          onChange={(v) => setWithdraw(v === "out")}
          className="bg-surface-2"
          options={[
            { value: "in", label: "Ajouter" },
            { value: "out", label: "Retirer" },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Montant" className={inputClass} />
          <button onClick={add} disabled={!cents} className="press h-12 shrink-0 rounded-2xl bg-strong px-5 font-semibold text-on-strong disabled:opacity-40">
            OK
          </button>
        </div>
      </div>

      <p className="mb-1 mt-5 px-1 text-[13px] font-medium text-muted">Historique</p>
      <Card className="py-1">
        {list.length === 0 && <p className="py-3 text-sm text-muted">Aucun versement pour l&apos;instant.</p>}
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2.5">
            <span className="flex-1 text-[15px] text-ink">
              {dayShort(c.contributed_on)} · {d.nameOf(c.user_id)}
            </span>
            <span className={cx("tabular font-semibold", c.amount_cents > 0 ? "text-ok" : "text-over")}>
              {c.amount_cents > 0 ? "+" : "−"}
              {money(Math.abs(c.amount_cents))}
            </span>
            <button onClick={() => confirmAction("Supprimer ce versement ?") && d.remove("savings_contributions", c.id)} className="text-xs text-muted">
              Suppr.
            </button>
          </div>
        ))}
      </Card>
      <Button variant="secondary" className="mt-4" onClick={() => onEdit(g)}>
        Modifier l&apos;objectif
      </Button>
    </Sheet>
  );
}

function GoalSheet({ open, goal, onClose }: { open: boolean; goal: SavingsGoal | null; onClose: () => void }) {
  const d = useData();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [icon, setIcon] = useState("target");
  const [color, setColor] = useState(PALETTE[4]);
  const [key, setKey] = useState("");

  const openKey = `${open}-${goal?.id ?? "new"}`;
  if (open && key !== openKey) {
    setKey(openKey);
    setName(goal?.name ?? "");
    setTarget(goal ? centsToInput(goal.target_cents) : "");
    setDate(goal?.target_date ?? "");
    setOwner(goal?.owner_id ?? null);
    setIcon(goal?.icon ?? "target");
    setColor(goal?.color ?? PALETTE[4]);
  }
  if (!open && key) setKey("");

  const cents = parseAmount(target);
  async function save() {
    if (!name.trim() || !cents) return;
    const row = { name: name.trim(), target_cents: cents, target_date: date || null, owner_id: owner, icon, color };
    const ok = goal ? await d.update("savings_goals", goal.id, row) : !!(await d.insert("savings_goals", row));
    if (ok) {
      d.toast(goal ? "Objectif modifié" : "Objectif créé");
      onClose();
    }
  }
  async function archive() {
    if (goal && confirmAction("Supprimer cet objectif et ses versements ?")) {
      await d.remove("savings_goals", goal.id);
      onClose();
    }
  }

  const ideas = [
    ["Tesla", "car"], ["Arrivée du bébé", "baby"], ["Vacances", "plane"], ["Achat immobilier", "house"],
  ] as const;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Modifier l'objectif" : "Nouvel objectif"}
      footer={
        <div className="flex gap-2">
          {goal && <Button variant="danger" className="w-auto" onClick={archive}>Supprimer</Button>}
          <Button onClick={save} disabled={!name.trim() || !cents}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {!goal && (
          <div className="flex flex-wrap gap-2">
            {ideas.map(([n, i]) => (
              <Chip key={n} active={name === n} onClick={() => { setName(n); setIcon(i); }}>
                <Icon name={i} size={16} /> {n}
              </Chip>
            ))}
          </div>
        )}
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacances au Japon" className={inputClass} />
        </Field>
        <Field label="Montant cible">
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="5 000" className={inputClass} />
        </Field>
        <Field label="Date cible (facultatif)">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Objectif</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={owner === null} onClick={() => setOwner(null)}>Commun</Chip>
            {d.members.map((m) => (
              <Chip key={m.user_id} active={owner === m.user_id} onClick={() => setOwner(m.user_id)}>
                {m.profile?.first_name}
              </Chip>
            ))}
          </div>
        </div>
        <IconColorPicker icon={icon} setIcon={setIcon} color={color} setColor={setColor} />
      </div>
    </Sheet>
  );
}
