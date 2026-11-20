"use client";

import { confirmAction } from "@/lib/demo";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Link2, Trash2 } from "lucide-react";
import { useData } from "@/lib/store";
import { centsToInput, money, parseAmount, today, toISODate, parseISODate, monthStart, dayShort } from "@/lib/format";
import { effectiveBudgets, matchPendingCharge, occurrencesForMonth, type Occurrence } from "@/lib/finance";
import { IconBubble, Icon } from "@/lib/icons";
import type { TxKind } from "@/lib/types";
import { Button, Chip, Segmented, Sheet, cx, inputClass } from "./ui";

const LAST_ACCOUNT = "tandem.lastAccount";

export function AddSheet() {
  const d = useData();
  const { sheet, closeSheet } = d;
  const editing = sheet.editing;

  const [kind, setKind] = useState<TxKind>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [assigned, setAssigned] = useState<string | null>(null);
  const [linked, setLinked] = useState<Occurrence | null>(null);
  const [dismissedMatch, setDismissedMatch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const accounts = useMemo(() => d.accounts.filter((a) => !a.archived), [d.accounts]);
  const defaultAccount = () => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_ACCOUNT);
    } catch {}
    return accounts.find((a) => a.id === last)?.id ?? accounts.find((a) => a.type !== "epargne")?.id ?? accounts[0]?.id ?? null;
  };

  // (Ré)initialisation à l'ouverture
  useEffect(() => {
    if (!sheet.open) return;
    const p = editing ?? sheet.preset;
    setKind(editing?.kind ?? sheet.kind ?? p?.kind ?? "expense");
    setAmount(p?.amount_cents ? centsToInput(p.amount_cents) : "");
    setLabel(p?.label ?? "");
    setCategoryId(p?.category_id ?? null);
    const acc = p?.account_id ?? defaultAccount();
    setAccountId(acc);
    setToAccountId(p?.to_account_id ?? null);
    setDate(p?.occurred_on ?? today());
    const owner = accounts.find((a) => a.id === acc)?.owner_id ?? null;
    setAssigned(p && "assigned_to" in p ? (p.assigned_to ?? null) : owner);
    setDismissedMatch(null);
    setLinked(null);
    if (sheet.charge) {
      const occ = occurrencesForMonth(d.recurring_expenses, d.scheduled_transactions, parseISODate(sheet.charge.due_on), "all").find(
        (o) => o.recurring.id === sheet.charge!.recurring_id && o.due_on === sheet.charge!.due_on,
      );
      if (occ) setLinked(occ);
    }
    if (!editing) setTimeout(() => amountRef.current?.focus(), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.open]);

  const cents = parseAmount(amount);
  const categories = d.categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense") && !c.archived);

  // Anti-doublon : proposer de rattacher la dépense à une échéance prévue
  const occurrences = useMemo(
    () => occurrencesForMonth(d.recurring_expenses, d.scheduled_transactions, monthStart(parseISODate(date)), "all"),
    [d.recurring_expenses, d.scheduled_transactions, date],
  );
  const suggestion =
    !editing && kind === "expense" && !linked
      ? matchPendingCharge(occurrences, { amount_cents: cents, label, category_id: categoryId })
      : null;
  const showSuggestion = suggestion && `${suggestion.recurring.id}${suggestion.due_on}` !== dismissedMatch;

  const linkCharge = (o: Occurrence) => {
    setLinked(o);
    if (!label) setLabel(o.recurring.label);
    if (!cents) setAmount(centsToInput(o.amount_cents));
    if (!categoryId && o.recurring.category_id) setCategoryId(o.recurring.category_id);
    if (o.recurring.account_id) setAccountId(o.recurring.account_id);
    setAssigned(o.recurring.assigned_to);
  };

  const pickAccount = (id: string) => {
    setAccountId(id);
    if (!editing) setAssigned(accounts.find((a) => a.id === id)?.owner_id ?? null);
  };

  const valid =
    !!cents && !!accountId && (kind !== "transfer" || (!!toAccountId && toAccountId !== accountId));

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const row = {
      kind,
      amount_cents: cents!,
      label: label.trim() || (kind === "transfer" ? "Virement" : categories.find((c) => c.id === categoryId)?.name ?? ""),
      category_id: kind === "transfer" ? null : categoryId,
      account_id: accountId,
      to_account_id: kind === "transfer" ? toAccountId : null,
      occurred_on: date,
      assigned_to: kind === "transfer" ? null : assigned,
    };
    try {
      localStorage.setItem(LAST_ACCOUNT, accountId!);
    } catch {}

    if (editing) {
      const ok = await d.update("transactions", editing.id, row);
      setSaving(false);
      if (ok) {
        d.toast("Opération modifiée");
        closeSheet();
      }
      return;
    }

    const created = await d.insert("transactions", row);
    if (created && linked) {
      await d.insert("scheduled_transactions", {
        recurring_expense_id: linked.recurring.id,
        due_on: linked.due_on,
        amount_cents: cents!,
        status: "paid",
        transaction_id: created.id,
      });
    }
    setSaving(false);
    if (!created) return;

    // Alerte budget à 80 % et au-delà de 100 %
    if (kind === "expense" && categoryId) {
      const m = monthStart(parseISODate(date));
      const b = effectiveBudgets(d.budgets, m).find((x) => x.category_id === categoryId);
      if (b) {
        const key = toISODate(m).slice(0, 7);
        const before = d.transactions
          .filter((t) => t.kind === "expense" && t.category_id === categoryId && t.occurred_on.startsWith(key))
          .reduce((s, t) => s + t.amount_cents, 0);
        const after = before + cents!;
        const name = categories.find((c) => c.id === categoryId)?.name;
        if (after > b.amount_cents && before <= b.amount_cents) {
          d.toast(`Budget ${name} dépassé : ${money(after)} / ${money(b.amount_cents)}`, "error");
        } else if (after >= b.amount_cents * 0.8 && before < b.amount_cents * 0.8) {
          d.toast(`Budget ${name} à ${Math.round((after / b.amount_cents) * 100)} %`, "warn");
        } else d.toast(kind === "expense" ? "Dépense ajoutée" : "Ajouté");
      } else d.toast("Dépense ajoutée");
    } else d.toast(kind === "income" ? "Revenu ajouté" : kind === "transfer" ? "Virement enregistré" : "Dépense ajoutée");
    closeSheet();
  }

  async function del() {
    if (!editing) return;
    if (!confirmAction("Supprimer cette opération ?")) return;
    if (await d.remove("transactions", editing.id)) {
      d.toast("Opération supprimée");
      closeSheet();
    }
  }

  const yesterday = toISODate(new Date(Date.now() - 864e5));
  const title = editing ? "Modifier" : kind === "income" ? "Nouveau revenu" : kind === "transfer" ? "Nouveau virement" : "Nouvelle dépense";

  return (
    <Sheet
      open={sheet.open}
      onClose={closeSheet}
      title={title}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button onClick={del} aria-label="Supprimer" className="press flex h-13 w-14 shrink-0 items-center justify-center rounded-2xl bg-over/10 text-over">
              <Trash2 size={20} />
            </button>
          )}
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      }
    >
      {!editing && (
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCategoryId(null);
            setLinked(null);
          }}
          options={[
            { value: "expense", label: "Dépense" },
            { value: "income", label: "Revenu" },
            { value: "transfer", label: "Virement" },
          ]}
        />
      )}

      {/* Montant */}
      <div className="mt-5 flex items-baseline justify-center gap-1">
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ""))}
          inputMode="decimal"
          placeholder="0"
          aria-label="Montant"
          className="font-display tabular w-full min-w-0 bg-transparent text-center text-[52px] font-semibold leading-none text-ink outline-none placeholder:text-muted/40"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <span className="font-display -ml-2 text-3xl font-semibold text-muted">€</span>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={kind === "transfer" ? "Intitulé (facultatif)" : "Intitulé, ex. Carrefour"}
        className={cx(inputClass, "mt-4")}
        enterKeyHint="done"
      />

      {/* Anti-doublon charges fixes */}
      {linked ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-lavande/25 px-4 py-3 text-sm text-ink">
          <Link2 size={18} className="shrink-0" />
          <span className="flex-1">
            Règle la charge <b>{linked.recurring.label}</b> du {dayShort(linked.due_on)}
          </span>
          <button onClick={() => setLinked(null)} className="font-medium text-muted">Retirer</button>
        </div>
      ) : (
        showSuggestion && (
          <div className="mt-3 rounded-2xl bg-peche/25 px-4 py-3 text-sm text-ink">
            <p>
              C&apos;est le prélèvement <b>{suggestion!.recurring.label}</b> prévu le {dayShort(suggestion!.due_on)} ?
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => linkCharge(suggestion!)} className="press rounded-full bg-aubergine px-3 py-1.5 text-xs font-semibold text-white">
                Oui, le rattacher
              </button>
              <button onClick={() => setDismissedMatch(`${suggestion!.recurring.id}${suggestion!.due_on}`)} className="rounded-full px-3 py-1.5 text-xs font-medium text-muted">
                Non
              </button>
            </div>
          </div>
        )
      )}

      {/* Catégorie */}
      {kind !== "transfer" && (
        <>
          <p className="mb-2 mt-5 px-1 text-[13px] font-medium text-muted">Catégorie</p>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                className={cx(
                  "press flex flex-col items-center gap-1 rounded-2xl border py-2.5",
                  c.id === categoryId ? "border-transparent" : "border-transparent bg-surface",
                )}
                style={c.id === categoryId ? { background: `${c.color}33`, borderColor: c.color } : undefined}
              >
                <IconBubble name={c.icon} color={c.color} size={34} />
                <span className="w-full truncate px-1 text-center text-[11px] font-medium text-ink">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Comptes */}
      <p className="mb-2 mt-5 px-1 text-[13px] font-medium text-muted">
        {kind === "income" ? "Compte crédité" : kind === "transfer" ? "Depuis" : "Compte débité"}
      </p>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <Chip key={a.id} active={a.id === accountId} onClick={() => pickAccount(a.id)}>
            <Icon name={a.icon} size={16} /> {a.name}
          </Chip>
        ))}
      </div>
      {kind === "transfer" && (
        <>
          <div className="my-2 flex justify-center text-muted">
            <ArrowDown size={18} />
          </div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Vers</p>
          <div className="flex flex-wrap gap-2">
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <Chip key={a.id} active={a.id === toAccountId} onClick={() => setToAccountId(a.id)}>
                  <Icon name={a.icon} size={16} /> {a.name}
                </Chip>
              ))}
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Un virement interne n&apos;est pas compté comme une dépense.</p>
        </>
      )}

      {/* Pour qui */}
      {kind !== "transfer" && d.members.length > 0 && (
        <>
          <p className="mb-2 mt-5 px-1 text-[13px] font-medium text-muted">{kind === "income" ? "Revenu de" : "Dépense de"}</p>
          <div className="flex flex-wrap gap-2">
            {d.members.map((m) => (
              <Chip key={m.user_id} active={assigned === m.user_id} onClick={() => setAssigned(m.user_id)}>
                {m.profile?.first_name || "…"}
              </Chip>
            ))}
            <Chip active={assigned === null} onClick={() => setAssigned(null)}>
              Commun
            </Chip>
          </div>
        </>
      )}

      {/* Date */}
      <p className="mb-2 mt-5 px-1 text-[13px] font-medium text-muted">Date</p>
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={date === today()} onClick={() => setDate(today())}>Aujourd&apos;hui</Chip>
        <Chip active={date === yesterday} onClick={() => setDate(yesterday)}>Hier</Chip>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface px-3 text-sm text-ink"
          aria-label="Choisir une date"
        />
      </div>
    </Sheet>
  );
}
