"use client";

import { useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { useData } from "@/lib/store";
import { bankBalance } from "@/lib/finance";
import { money } from "@/lib/format";
import { Avatar, Button, Field, Sheet, cx, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** « 2 018,41 », « -35,5 », « 1 200 € » → centimes (négatif accepté : découvert). */
function parseBalance(input: string): number | null {
  const clean = input.replace(/\s|€/g, "").replace(",", ".").replace("−", "-");
  if (!/^-?\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

/** Carte « Compte perso » : le solde de la banque, suivi au fil des saisies. */
export function BankBalanceCard() {
  const d = useData();
  const [open, setOpen] = useState(false);
  const people = d.members
    .map((m) => m.profile)
    .filter((p): p is Profile => !!p)
    .filter((p) => d.scope === "all" || p.id === d.scope)
    .sort((a, b) => (a.id === d.me?.id ? -1 : b.id === d.me?.id ? 1 : 0));
  if (!people.length) return null;

  return (
    <section className="animate-rise mt-3 rounded-[26px] border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[14px] font-medium text-muted">
          <Landmark size={15} /> {people.length > 1 ? "Comptes perso" : "Compte perso"}
        </p>
        <span className="text-[12px] text-muted">comme dans la banque</span>
      </div>
      <div className="mt-2 divide-y divide-line">
        {people.map((p) => {
          const b = bankBalance(p, d.transactions);
          const mine = p.id === d.me?.id;
          return (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              {people.length > 1 && <Avatar profile={p} size={32} />}
              <div className="min-w-0 flex-1">
                {b ? (
                  <>
                    <p className={cx("font-num tabular text-[26px] font-semibold leading-tight", b.cents < 0 ? "text-over" : "text-ink")}>{money(b.cents)}</p>
                    <p className="truncate text-[12px] text-muted">
                      recalé le {when.format(new Date(b.at))}
                      {b.count > 0 && ` · ${b.delta >= 0 ? "+" : "−"}${money(Math.abs(b.delta))} depuis`}
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] text-muted">
                    {mine ? "Indique ton solde pour suivre ton compte." : `${p.first_name} n'a pas encore indiqué son solde.`}
                  </p>
                )}
              </div>
              {mine && (
                <button
                  onClick={() => setOpen(true)}
                  className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold text-ink"
                >
                  <RefreshCw size={14} /> {b ? "Recaler" : "Indiquer"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <RecalSheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function RecalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useData();
  const [value, setValue] = useState("");
  const cents = parseBalance(value);
  const save = async () => {
    if (cents == null) return;
    const ok = await d.updateProfile({ bank_balance_cents: cents, bank_balance_at: new Date().toISOString() });
    if (ok) {
      d.toast("Solde recalé sur la banque");
      setValue("");
      onClose();
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Solde de ton compte"
      footer={<Button onClick={save} disabled={cents == null} className="mb-3">Recaler</Button>}
    >
      <Field label="Solde affiché par ta banque (€)" hint="Prends le solde qui inclut les opérations carte en cours. Ensuite, chaque revenu, dépense ou épargne daté d'aujourd'hui ou après le fait bouger. Ce qui est daté d'avant est considéré comme déjà dans le solde de la banque.">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d,.\s−-]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          inputMode="decimal"
          placeholder="2 018,41"
          autoFocus
          className={cx(inputClass, "font-num text-xl")}
        />
      </Field>
    </Sheet>
  );
}
