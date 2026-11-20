"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/store";
import { averageIncome, computeSplit } from "@/lib/finance";
import { centsToInput, money, parseAmount } from "@/lib/format";
import type { SplitMode } from "@/lib/types";
import { Avatar, Button, Card, Page, PageHeader, cx, inputClass } from "@/components/ui";

const MODES: { value: SplitMode; label: string; hint: string }[] = [
  { value: "equal", label: "50 / 50", hint: "Chacun paie la moitié des dépenses communes." },
  { value: "prorata", label: "Au prorata", hint: "Chacun paie selon son salaire net." },
  { value: "prorata_after_credits", label: "Prorata après crédits", hint: "Prorata du salaire, une fois les crédits personnels déduits." },
  { value: "equal_rate", label: "Même effort", hint: "Chacun garde le même % de son salaire une fois tout payé." },
  { value: "custom", label: "Personnalisé", hint: "Vous fixez vous-mêmes les pourcentages." },
];

export default function RepartitionPage() {
  const d = useData();
  const settings = d.household?.split_settings ?? { mode: "equal_rate" as SplitMode };
  const ids = d.members.map((m) => m.user_id);

  const [mode, setMode] = useState<SplitMode>(settings.mode);
  const [incomes, setIncomes] = useState<Record<string, string>>(() =>
    Object.fromEntries(ids.map((id) => [id, centsToInput(settings.incomes?.[id] ?? averageIncome(d.transactions, id))])),
  );
  const [custom, setCustom] = useState<number>(() => settings.custom?.[ids[0]] ?? 60);

  const incomeCents = Object.fromEntries(ids.map((id) => [id, parseAmount(incomes[id] ?? "") ?? 0]));
  const customMap = ids.length === 2 ? { [ids[0]]: custom, [ids[1]]: 100 - custom } : {};
  const params = { memberIds: ids, incomes: incomeCents, custom: customMap, recurring: d.recurring_expenses, transactions: d.transactions, categories: d.categories };
  const result = useMemo(() => computeSplit({ mode, ...params }), [mode, JSON.stringify(incomeCents), custom, d.recurring_expenses, d.transactions]); // eslint-disable-line react-hooks/exhaustive-deps
  const compare = MODES.filter((m) => m.value !== "custom").map((m) => ({ m, r: computeSplit({ mode: m.value, ...params }) }));

  async function save() {
    const ok = await d.updateHousehold({ split_settings: { mode, incomes: incomeCents, custom: customMap } });
    if (ok) d.toast("Répartition enregistrée");
  }

  const profile = (id: string) => d.members.find((m) => m.user_id === id)?.profile;

  return (
    <Page>
      <PageHeader title="Répartition" back="/profil" subtitle="Qui verse combien sur le compte joint" />

      <p className="mb-2 px-1 text-[13px] font-medium text-muted">Salaires nets mensuels</p>
      <div className="grid grid-cols-2 gap-3">
        {ids.map((id) => (
          <Card key={id} className="!p-3">
            <div className="mb-2 flex items-center gap-2">
              <Avatar profile={profile(id)} size={24} />
              <span className="text-sm font-medium text-ink">{profile(id)?.first_name}</span>
            </div>
            <input
              value={incomes[id] ?? ""}
              onChange={(e) => setIncomes({ ...incomes, [id]: e.target.value })}
              inputMode="decimal"
              className={cx(inputClass, "font-display h-11 text-lg")}
              aria-label={`Salaire de ${profile(id)?.first_name}`}
            />
          </Card>
        ))}
      </div>

      <p className="mb-2 mt-6 px-1 text-[13px] font-medium text-muted">Méthode</p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cx(
              "press rounded-2xl border p-3 text-left",
              mode === m.value ? "border-transparent bg-grad-cta text-aubergine" : "border-line bg-surface text-ink",
            )}
          >
            <span className="block text-[15px] font-semibold">{m.label}</span>
            <span className={cx("mt-0.5 block text-[12px] leading-snug", mode === m.value ? "text-aubergine/75" : "text-muted")}>{m.hint}</span>
          </button>
        ))}
      </div>

      {mode === "custom" && ids.length === 2 && (
        <Card className="mt-3">
          <div className="flex justify-between text-sm font-medium text-ink">
            <span>{profile(ids[0])?.first_name} {custom} %</span>
            <span>{profile(ids[1])?.first_name} {100 - custom} %</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={custom} onChange={(e) => setCustom(Number(e.target.value))} className="mt-3 w-full accent-[#FFAE97]" />
        </Card>
      )}

      {/* Résultat */}
      <Card className="bg-grad-night mt-5 !p-5 text-white">
        <p className="text-sm text-white/70">Dépenses communes par mois</p>
        <p className="font-display tabular text-[30px] font-semibold">{money(result.base)}</p>
        <p className="text-[12px] text-white/60">
          Charges fixes communes {money(result.commonFixed)} · moyenne réelle des 3 derniers mois {money(result.commonAvg)}
        </p>
      </Card>

      <div className="mt-3 space-y-3">
        {result.lines.map((l) => (
          <Card key={l.user_id}>
            <div className="flex items-center gap-3">
              <Avatar profile={profile(l.user_id)} size={40} />
              <div className="flex-1">
                <p className="font-semibold text-ink">{profile(l.user_id)?.first_name}</p>
                <p className="text-[12px] text-muted">{Math.round(l.share * 100)} % des dépenses communes</p>
              </div>
              <div className="text-right">
                <p className="font-display tabular text-xl font-semibold text-ink">{money(l.contribution)}</p>
                <p className="text-[12px] text-muted">sur le joint</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
              <Row label="Salaire" value={money(l.income)} />
              <Row label="Part du joint" value={`− ${money(l.contribution)}`} />
              <Row label="Charges perso (crédit, forfait…)" value={`− ${money(l.personalFixed)}`} />
              <div className="flex justify-between pt-1 text-[15px] font-semibold">
                <span className="text-ink">Reste pour soi</span>
                <span className={cx("tabular", l.left < 0 ? "text-over" : "text-ok")}>
                  {money(l.left)} · {Math.round(l.leftRatio * 100)} %
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Comparaison des méthodes */}
      <p className="mb-2 mt-6 px-1 text-[13px] font-medium text-muted">Comparer : reste pour soi selon la méthode</p>
      <Card className="py-2">
        {compare.map(({ m, r }) => (
          <button key={m.value} onClick={() => setMode(m.value)} className="press flex w-full items-center gap-3 py-2.5 text-left">
            <span className={cx("min-w-0 flex-1 text-[14px]", mode === m.value ? "font-semibold text-ink" : "text-ink")}>{m.label}</span>
            {r.lines.map((l) => (
              <span key={l.user_id} className={cx("tabular w-24 text-right text-[13px]", l.left < 0 ? "text-over" : "text-muted")}>
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: profile(l.user_id)?.color }} />
                {money(l.left).replace(",00", "")}
              </span>
            ))}
          </button>
        ))}
      </Card>
      <p className="mt-2 px-2 text-xs text-muted">
        Les dépenses personnelles restent payées par chacun sur son compte. Ce qui reste sert à épargner, chacun de son côté.
      </p>

      <Button className="mt-5" onClick={save}>
        Enregistrer cette répartition
      </Button>
    </Page>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
