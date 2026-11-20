"use client";

import { confirmAction } from "@/lib/demo";
import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { useData } from "@/lib/store";
import { centsToInput, money, monthStart, parseAmount, today } from "@/lib/format";
import { occurrencesForMonth } from "@/lib/finance";
import { Icon, IconBubble } from "@/lib/icons";
import type { Frequency, RecurringExpense } from "@/lib/types";
import { Button, Card, Chip, EmptyState, Field, Page, PageHeader, Sheet, Toggle, inputClass } from "@/components/ui";

const FREQ: { value: Frequency; label: string; perMonth: number }[] = [
  { value: "monthly", label: "Mensuelle", perMonth: 1 },
  { value: "quarterly", label: "Trimestrielle", perMonth: 1 / 3 },
  { value: "yearly", label: "Annuelle", perMonth: 1 / 12 },
  { value: "weekly", label: "Hebdomadaire", perMonth: 52 / 12 },
];

const IDEAS = ["Loyer", "Électricité", "Eau", "Assurances", "Crédit", "Internet", "Téléphone", "Abonnement"];

export default function ChargesPage() {
  const d = useData();
  const [edit, setEdit] = useState<RecurringExpense | "new" | null>(null);
  const list = d.recurring_expenses;
  const monthly = list.filter((r) => r.active).reduce((s, r) => s + r.amount_cents * (FREQ.find((f) => f.value === r.frequency)?.perMonth ?? 1), 0);
  const occ = occurrencesForMonth(list, d.scheduled_transactions, monthStart(new Date()), "all");

  return (
    <Page>
      <PageHeader
        title="Charges fixes"
        back="/profil"
        right={
          <button onClick={() => setEdit("new")} aria-label="Nouvelle charge" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Plus size={22} />
          </button>
        }
      />
      <Card className="bg-grad-night !p-5 text-white">
        <p className="text-sm text-white/70">Charges fixes par mois (moyenne)</p>
        <p className="font-display tabular text-[32px] font-semibold">{money(Math.round(monthly))}</p>
        <p className="mt-1 text-[13px] text-white/70">
          Ce mois-ci : {occ.filter((o) => o.status === "paid").length} réglées · {occ.filter((o) => o.status === "pending").length} à venir
        </p>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarClock size={24} />} title="Aucune charge" text="Loyer, électricité, assurances… Elles alimentent le reste à vivre." action={<Button onClick={() => setEdit("new")}>Ajouter une charge</Button>} />
      ) : (
        <Card className="mt-4 py-1">
          {list.map((r) => {
            const cat = d.categories.find((c) => c.id === r.category_id);
            const o = occ.find((x) => x.recurring.id === r.id);
            return (
              <button key={r.id} onClick={() => setEdit(r)} className={`press flex w-full items-center gap-3 py-2.5 text-left ${r.active ? "" : "opacity-40"}`}>
                <IconBubble name={cat?.icon ?? "repeat"} color={cat?.color ?? "#9C8FE0"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{r.label}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {FREQ.find((f) => f.value === r.frequency)?.label} · le {r.day_of_month} · {d.nameOf(r.assigned_to)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block font-semibold text-ink">{money(r.amount_cents)}</span>
                  {o && <span className={`block text-[11px] font-medium ${o.status === "paid" ? "text-ok" : "text-muted"}`}>{o.status === "paid" ? "Réglée" : o.status === "skipped" ? "Ignorée" : "À venir"}</span>}
                </span>
              </button>
            );
          })}
        </Card>
      )}
      <p className="mt-6 px-2 text-center text-xs text-muted">
        Quand vous saisissez une dépense qui correspond à une charge prévue, TANDEM propose de la rattacher pour éviter de la compter deux fois.
      </p>
      <ChargeSheet item={edit} onClose={() => setEdit(null)} />
    </Page>
  );
}

function ChargeSheet({ item, onClose }: { item: RecurringExpense | "new" | null; onClose: () => void }) {
  const d = useData();
  const r = item && item !== "new" ? item : null;
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [day, setDay] = useState("5");
  const [cat, setCat] = useState<string | null>(null);
  const [acc, setAcc] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const k = item ? (r?.id ?? "new") : "";
  if (k !== key) {
    setKey(k);
    setLabel(r?.label ?? "");
    setAmount(r ? centsToInput(r.amount_cents) : "");
    setFreq(r?.frequency ?? "monthly");
    setDay(String(r?.day_of_month ?? 5));
    setCat(r?.category_id ?? d.categories.find((c) => c.name === "Logement")?.id ?? null);
    setAcc(r?.account_id ?? d.accounts.find((a) => a.type === "joint")?.id ?? null);
    setWho(r ? r.assigned_to : null);
    setActive(r?.active ?? true);
  }
  const cents = parseAmount(amount);
  const dayN = Math.min(31, Math.max(1, Number(day) || 1));

  async function save() {
    if (!cents || !label.trim()) return;
    const row = {
      label: label.trim(), amount_cents: cents, frequency: freq, day_of_month: dayN, category_id: cat, account_id: acc,
      assigned_to: who, active, ...(r ? {} : { start_date: today().slice(0, 8) + "01" }),
    };
    const ok = r ? await d.update("recurring_expenses", r.id, row) : !!(await d.insert("recurring_expenses", row));
    if (ok) {
      d.toast(r ? "Charge modifiée" : "Charge ajoutée");
      onClose();
    }
  }
  async function del() {
    if (r && confirmAction(`Supprimer « ${r.label} » ? Les dépenses déjà enregistrées sont conservées.`)) {
      await d.remove("recurring_expenses", r.id);
      onClose();
    }
  }

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={r ? r.label : "Nouvelle charge"}
      footer={
        <div className="flex gap-2">
          {r && <Button variant="danger" className="w-auto" onClick={del}>Supprimer</Button>}
          <Button onClick={save} disabled={!cents || !label.trim()}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {!r && (
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <Chip key={i} active={label === i} onClick={() => setLabel(i)}>{i}</Chip>
            ))}
          </div>
        )}
        <Field label="Intitulé">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (€)">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputClass} />
          </Field>
          <Field label="Jour du prélèvement">
            <input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} className={inputClass} />
          </Field>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Fréquence</p>
          <div className="flex flex-wrap gap-2">
            {FREQ.map((f) => (
              <Chip key={f.value} active={freq === f.value} onClick={() => setFreq(f.value)}>{f.label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Catégorie</p>
          <div className="flex flex-wrap gap-2">
            {d.categories.filter((c) => c.kind === "expense" && !c.archived).map((c) => (
              <Chip key={c.id} active={cat === c.id} color={c.color} onClick={() => setCat(c.id)}>
                <Icon name={c.icon} size={16} /> {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Compte prélevé</p>
          <div className="flex flex-wrap gap-2">
            {d.accounts.filter((a) => !a.archived).map((a) => (
              <Chip key={a.id} active={acc === a.id} onClick={() => setAcc(a.id)}>{a.name}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Pour</p>
          <div className="flex flex-wrap gap-2">
            {d.members.map((m) => (
              <Chip key={m.user_id} active={who === m.user_id} onClick={() => setWho(m.user_id)}>{m.profile?.first_name}</Chip>
            ))}
            <Chip active={who === null} onClick={() => setWho(null)}>Commun</Chip>
          </div>
        </div>
        {r && (
          <Card>
            <Toggle checked={active} onChange={setActive} label="Charge active" />
          </Card>
        )}
      </div>
    </Sheet>
  );
}
