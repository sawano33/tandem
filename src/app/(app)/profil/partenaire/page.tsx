"use client";

import { useState } from "react";
import { Copy, Share2, ShieldCheck } from "lucide-react";
import { useData } from "@/lib/store";
import { Avatar, Button, Card, Field, Page, PageHeader, inputClass } from "@/components/ui";

export default function PartenairePage() {
  const d = useData();
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState(d.household?.name ?? "");

  async function invite() {
    const c = await d.createInvitation();
    if (c) setCode(c);
  }
  async function share() {
    const text = `Rejoins notre foyer sur TANDEM avec le code ${code} (valable 14 jours).`;
    if (navigator.share) await navigator.share({ title: "TANDEM", text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(code!);
      d.toast("Code copié");
    }
  }

  return (
    <Page>
      <PageHeader title="Partenaire" back="/profil" />

      <Card className="py-2">
        {d.members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 py-2">
            <Avatar profile={m.profile} size={44} />
            <div className="flex-1">
              <p className="font-semibold text-ink">
                {m.profile?.first_name || "…"} {m.user_id === d.user?.id && <span className="font-normal text-muted">(moi)</span>}
              </p>
              <p className="text-[13px] text-muted">{m.role === "owner" ? "Créateur du foyer" : "Membre"}</p>
            </div>
          </div>
        ))}
      </Card>

      {d.members.length < 2 ? (
        <Card className="bg-grad-hero mt-4 !p-5 text-aubergine">
          <p className="font-display text-xl font-semibold">Invitez votre partenaire</p>
          <p className="mt-1 text-sm opacity-80">Un code à 6 caractères, à saisir lors de sa première connexion.</p>
          {code ? (
            <>
              <p className="font-display mt-4 text-center text-[40px] font-semibold tracking-[0.3em]">{code}</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={share} className="bg-grad-night !text-white"><Share2 size={18} /> Partager</Button>
                <button onClick={() => navigator.clipboard.writeText(code).then(() => d.toast("Code copié"))} className="press flex h-13 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/60" aria-label="Copier">
                  <Copy size={18} />
                </button>
              </div>
            </>
          ) : (
            <Button onClick={invite} className="bg-grad-night mt-4 !text-white">Générer un code</Button>
          )}
        </Card>
      ) : (
        <Card className="mt-4 flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-ok" size={22} />
          <p className="text-sm text-ink">
            Vous êtes synchronisés : chaque dépense commune ajoutée par l&apos;un apparaît immédiatement chez l&apos;autre. Les comptes marqués « privé » restent visibles uniquement par leur titulaire.
          </p>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        <Field label="Nom du foyer">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Button variant="secondary" onClick={() => d.updateHousehold({ name: name.trim() }).then((ok) => ok && d.toast("Nom mis à jour"))} disabled={!name.trim()}>
          Renommer
        </Button>
      </div>
    </Page>
  );
}
