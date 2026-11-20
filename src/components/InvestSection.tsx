"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useData } from "@/lib/store";
import { centsToInput, dayShort, money, parseAmount } from "@/lib/format";
import { confirmAction } from "@/lib/demo";
import type { Account, Holding } from "@/lib/types";
import { Button, Card, Chip, Field, Segmented, Sheet, cx, inputClass } from "./ui";

/** Comptes d'investissement (Trade Republic…) : valeur globale ou détail des ETF, tout est modifiable. */
export function InvestSection() {
  const d = useData();
  const [open, setOpen] = useState<Account | "new" | null>(null);
  const accounts = d.accounts.filter((a) => !a.archived && a.type === "epargne" && (d.scope === "all" || a.owner_id === d.scope));
  const total = accounts.reduce((s, a) => s + a.balance_cents, 0);

  return (
    <>
      <Card className="bg-grad-night mt-4 !p-5 text-white">
        <p className="text-sm text-white/70">Épargne investie</p>
        <p className="font-display tabular text-[32px] font-semibold">{money(total)}</p>
        <div className="mt-3 flex gap-3">
          {accounts.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 text-[13px] text-white/80">
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              {a.owner_id ? d.nameOf(a.owner_id) : a.name} {total ? Math.round((a.balance_cents / total) * 100) : 0} %
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-3 space-y-3">
        {accounts.map((a) => {
          const lines = d.holdings.filter((h) => h.account_id === a.id);
          const invested = lines.reduce((s, h) => s + (h.invested_cents ?? 0), 0);
          const gain = invested ? a.balance_cents - invested : null;
          return (
            <Card key={a.id} onClick={() => setOpen(a)}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-semibold text-aubergine" style={{ background: a.color }}>
                  {(a.owner_id ? d.nameOf(a.owner_id) : a.name).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{a.name}</p>
                  <p className="text-[12px] text-muted">
                    {lines.length ? `${lines.length} ligne${lines.length > 1 ? "s" : ""}` : "Montant global"}
                    {a.value_updated_at && !lines.length && ` · maj ${dayShort(a.value_updated_at.slice(0, 10))}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display tabular text-lg font-semibold text-ink">{money(a.balance_cents)}</p>
                  {gain !== null && (
                    <p className={cx("tabular flex items-center justify-end gap-1 text-[12px] font-medium", gain >= 0 ? "text-ok" : "text-over")}>
                      {gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {gain >= 0 ? "+" : "−"}
                      {money(Math.abs(gain))}
                    </p>
                  )}
                </div>
              </div>
              {lines.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {lines.map((h) => (
                    <div key={h.id} className="flex justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{h.name}</span>
                      <span className="tabular shrink-0 text-muted">{money(h.value_cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        <button onClick={() => setOpen("new")} className="press flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-line py-4 text-sm font-medium text-muted">
          <Plus size={18} /> Ajouter un compte d&apos;épargne
        </button>
      </div>
      <InvestSheet item={open} onClose={() => setOpen(null)} />
    </>
  );
}

function InvestSheet({ item, onClose }: { item: Account | "new" | null; onClose: () => void }) {
  const d = useData();
  const live = item && item !== "new" ? d.accounts.find((a) => a.id === item.id) ?? item : null;
  const lines = live ? d.holdings.filter((h) => h.account_id === live.id) : [];
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [mode, setMode] = useState<"global" | "detail">("global");
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<Holding | "new" | null>(null);

  const k = item ? (live?.id ?? "new") : "";
  if (k !== key) {
    setKey(k);
    setName(live?.name ?? "Trade Republic");
    setOwner(live ? live.owner_id : d.user?.id ?? null);
    setMode(live && d.holdings.some((h) => h.account_id === live.id) ? "detail" : "global");
    setValue(live ? centsToInput(live.balance_cents) : "");
    setEditing(null);
  }

  async function saveAccount() {
    const v = value.trim() === "" ? 0 : parseAmount(value) ?? 0;
    const row: Record<string, unknown> = { name: name.trim(), owner_id: owner, type: "epargne", icon: "landmark", color: d.profiles.find((p) => p.id === owner)?.color ?? "#C5B6F2" };
    if (mode === "global") Object.assign(row, { manual_value_cents: v, value_updated_at: new Date().toISOString() });
    const ok = live ? await d.update("accounts", live.id, row) : !!(await d.insert("accounts", { ...row, sort: 10 }));
    if (ok) {
      d.toast("Épargne mise à jour");
      onClose();
    }
  }
  async function archive() {
    if (live && confirmAction(`Retirer « ${live.name} » ?`)) {
      await d.update("accounts", live.id, { archived: true });
      onClose();
    }
  }

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={live ? live.name : "Nouveau compte d'épargne"}
      footer={
        <div className="flex gap-2">
          {live && <Button variant="danger" className="w-auto" onClick={archive}>Retirer</Button>}
          <Button onClick={saveAccount} disabled={!name.trim()}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trade Republic" className={inputClass} />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">À qui</p>
          <div className="flex flex-wrap gap-2">
            {d.members.map((m) => (
              <Chip key={m.user_id} active={owner === m.user_id} onClick={() => setOwner(m.user_id)}>{m.profile?.first_name}</Chip>
            ))}
            <Chip active={owner === null} onClick={() => setOwner(null)}>Commun</Chip>
          </div>
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "global", label: "Montant global" },
            { value: "detail", label: "Détail des ETF" },
          ]}
        />

        {mode === "global" ? (
          <Field label="Valeur actuelle (€)" hint="Mettez-la à jour quand vous voulez, en un geste.">
            <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" className={cx(inputClass, "font-display text-xl")} />
          </Field>
        ) : !live ? (
          <p className="px-1 text-sm text-muted">Enregistrez d&apos;abord le compte, puis ajoutez vos ETF.</p>
        ) : (
          <div>
            <div className="space-y-2">
              {lines.map((h) =>
                editing !== "new" && editing?.id === h.id ? (
                  <HoldingForm key={h.id} accountId={live.id} holding={h} onDone={() => setEditing(null)} />
                ) : (
                  <button key={h.id} onClick={() => setEditing(h)} className="press flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{h.name}</span>
                      <span className="block text-[12px] text-muted">
                        {[h.ticker, h.quantity ? `${h.quantity.toLocaleString("fr-FR")} parts` : null].filter(Boolean).join(" · ") || "Touchez pour modifier"}
                      </span>
                    </span>
                    <span className="tabular font-semibold text-ink">{money(h.value_cents)}</span>
                  </button>
                ),
              )}
            </div>
            {editing === "new" ? (
              <div className="mt-2">
                <HoldingForm accountId={live.id} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <button onClick={() => setEditing("new")} className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted">
                <Plus size={16} /> Ajouter un ETF ou une action
              </button>
            )}
            <p className="mt-3 px-1 text-xs text-muted">La valeur du compte est la somme des lignes. Mettez les montants à jour depuis l&apos;app Trade Republic quand vous voulez.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function HoldingForm({ accountId, holding, onDone }: { accountId: string; holding?: Holding; onDone: () => void }) {
  const d = useData();
  const [name, setName] = useState(holding?.name ?? "");
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [qty, setQty] = useState(holding?.quantity != null ? String(holding.quantity).replace(".", ",") : "");
  const [value, setValue] = useState(holding ? centsToInput(holding.value_cents) : "");
  const [invested, setInvested] = useState(holding?.invested_cents ? centsToInput(holding.invested_cents) : "");
  const v = parseAmount(value);

  async function save() {
    if (!name.trim() || v === null) return;
    const row = {
      account_id: accountId, name: name.trim(), ticker: ticker.trim() || null,
      quantity: qty.trim() ? Number(qty.replace(",", ".")) || null : null,
      value_cents: v, invested_cents: invested.trim() ? parseAmount(invested) : null, updated_at: new Date().toISOString(),
    };
    const ok = holding ? await d.update("holdings", holding.id, row) : !!(await d.insert("holdings", row));
    if (ok) onDone();
  }
  async function del() {
    if (holding && confirmAction(`Supprimer ${holding.name} ?`)) {
      await d.remove("holdings", holding.id);
      onDone();
    }
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-lavande/40 bg-surface p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom, ex. MSCI World" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="ISIN (facultatif)" className={inputClass} />
        <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="Parts" className={inputClass} />
        <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="Valeur €" className={inputClass} />
        <input value={invested} onChange={(e) => setInvested(e.target.value)} inputMode="decimal" placeholder="Investi €" className={inputClass} />
      </div>
      <div className="flex gap-2">
        {holding && (
          <button onClick={del} aria-label="Supprimer" className="press flex h-11 w-12 items-center justify-center rounded-xl bg-over/10 text-over">
            <Trash2 size={18} />
          </button>
        )}
        <button onClick={onDone} className="h-11 flex-1 rounded-xl bg-surface-2 text-sm font-medium text-ink">Annuler</button>
        <button onClick={save} disabled={!name.trim() || v === null} className="h-11 flex-1 rounded-xl bg-strong text-sm font-semibold text-on-strong disabled:opacity-40">
          OK
        </button>
      </div>
    </div>
  );
}
