"use client";

import { confirmAction } from "@/lib/demo";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { useData } from "@/lib/store";
import { centsToInput, money, parseAmount } from "@/lib/format";
import { IconBubble } from "@/lib/icons";
import type { Account, AccountType } from "@/lib/types";
import { IconColorPicker } from "@/components/IconColorPicker";
import { Button, Card, Chip, Field, Page, PageHeader, Sheet, Toggle, inputClass } from "@/components/ui";

const TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "courant", label: "Compte courant", icon: "user" },
  { value: "joint", label: "Compte joint", icon: "users" },
  { value: "epargne", label: "Livret d'épargne", icon: "piggy-bank" },
  { value: "pro", label: "Professionnel", icon: "briefcase" },
  { value: "especes", label: "Espèces", icon: "banknote" },
];

export default function ComptesPage() {
  const d = useData();
  const [edit, setEdit] = useState<Account | "new" | null>(null);
  const active = d.accounts.filter((a) => !a.archived);
  const total = active.reduce((s, a) => s + a.balance_cents, 0);

  return (
    <Page>
      <PageHeader
        title="Comptes"
        back="/profil"
        right={
          <button onClick={() => setEdit("new")} aria-label="Ajouter un compte" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Plus size={22} />
          </button>
        }
      />
      <Card className="bg-grad-night !p-5 text-white">
        <p className="text-sm text-white/70">Patrimoine total visible</p>
        <p className="font-display tabular text-[32px] font-semibold">{money(total)}</p>
      </Card>

      {TYPES.map((t) => {
        const list = active.filter((a) => a.type === t.value);
        if (!list.length) return null;
        return (
          <section key={t.value}>
            <p className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">{t.label}</p>
            <Card className="py-1">
              {list.map((a) => (
                <button key={a.id} onClick={() => setEdit(a)} className="press flex w-full items-center gap-3 py-2.5 text-left">
                  <IconBubble name={a.icon} color={a.color} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[15px] font-medium text-ink">
                      {a.name} {a.is_private && <Lock size={13} className="text-muted" />}
                    </span>
                    <span className="text-[13px] text-muted">{a.owner_id ? d.nameOf(a.owner_id) : "Commun"}</span>
                  </span>
                  <span className="tabular font-semibold text-ink">{money(a.balance_cents)}</span>
                </button>
              ))}
            </Card>
          </section>
        );
      })}
      <p className="mt-6 px-2 text-center text-xs text-muted">
        Les soldes évoluent automatiquement avec les opérations. Un compte privé n&apos;est visible que par son titulaire.
      </p>
      <AccountSheet account={edit} onClose={() => setEdit(null)} />
    </Page>
  );
}

function AccountSheet({ account, onClose }: { account: Account | "new" | null; onClose: () => void }) {
  const d = useData();
  const a = account && account !== "new" ? account : null;
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("courant");
  const [owner, setOwner] = useState<string | null>(null);
  const [initial, setInitial] = useState("");
  const [icon, setIcon] = useState("wallet");
  const [color, setColor] = useState("#8B7FD1");
  const [priv, setPriv] = useState(false);

  const k = account ? (a?.id ?? "new") : "";
  if (k !== key) {
    setKey(k);
    setName(a?.name ?? "");
    setType(a?.type ?? "courant");
    setOwner(a ? a.owner_id : d.user?.id ?? null);
    setInitial(a ? centsToInput(a.initial_balance_cents) : "");
    setIcon(a?.icon ?? "wallet");
    setColor(a?.color ?? d.me?.color ?? "#8B7FD1");
    setPriv(a?.is_private ?? false);
  }

  const parsedInitial = initial.trim() === "" ? 0 : initial.trim().startsWith("-") ? -(parseAmount(initial.slice(1)) ?? 0) : parseAmount(initial) ?? 0;

  async function save() {
    const row = {
      name: name.trim(), type, owner_id: owner, initial_balance_cents: parsedInitial, icon, color,
      is_private: owner === d.user?.id ? priv : false,
    };
    const ok = a ? await d.update("accounts", a.id, row) : !!(await d.insert("accounts", row));
    if (ok) {
      d.toast(a ? "Compte modifié" : "Compte créé");
      onClose();
    }
  }
  async function archive() {
    if (a && confirmAction(`Archiver « ${a.name} » ? L'historique est conservé.`)) {
      await d.update("accounts", a.id, { archived: true });
      onClose();
    }
  }

  return (
    <Sheet
      open={!!account}
      onClose={onClose}
      title={a ? "Modifier le compte" : "Nouveau compte"}
      footer={
        <div className="flex gap-2">
          {a && <Button variant="danger" className="w-auto" onClick={archive}>Archiver</Button>}
          <Button onClick={save} disabled={!name.trim()}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Compte Guillaume" className={inputClass} />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => { setType(t.value); setIcon(t.icon); if (t.value === "joint") setOwner(null); }}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Titulaire</p>
          <div className="flex flex-wrap gap-2">
            {d.members.map((m) => (
              <Chip key={m.user_id} active={owner === m.user_id} onClick={() => setOwner(m.user_id)}>{m.profile?.first_name}</Chip>
            ))}
            <Chip active={owner === null} onClick={() => setOwner(null)}>Commun</Chip>
          </div>
        </div>
        <Field label="Solde initial (€)" hint="Le solde réel du compte au moment où vous commencez à utiliser TANDEM.">
          <input value={initial} onChange={(e) => setInitial(e.target.value)} inputMode="decimal" placeholder="0" className={inputClass} />
        </Field>
        {owner === d.user?.id && (
          <Card>
            <Toggle checked={priv} onChange={setPriv} label="Compte privé (visible par moi seul)" />
          </Card>
        )}
        <IconColorPicker icon={icon} setIcon={setIcon} color={color} setColor={setColor} />
      </div>
    </Sheet>
  );
}
