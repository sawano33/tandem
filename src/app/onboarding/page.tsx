"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Logo";
import { Button, Field, Segmented, inputClass } from "@/components/ui";

const COLORS: Record<string, string> = { guillaume: "#7DB0F7", emma: "#F5A3C7" };

export default function OnboardingPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [firstName, setFirstName] = useState("");
  const [name, setName] = useState("Guillaume & Emma");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: { id: string; email?: string } | null } }) => {
      if (!data.user) return router.replace("/login");
      const { data: p } = await supabase.from("profiles").select("first_name").eq("id", data.user.id).maybeSingle();
      const guess = p?.first_name || (data.user.email === process.env.NEXT_PUBLIC_EMAIL_EMMA ? "Emma" : data.user.email === process.env.NEXT_PUBLIC_EMAIL_GUILLAUME ? "Guillaume" : "");
      setFirstName(guess);
      if (guess === "Emma") setMode("join");
    });
  }, [supabase, router]);

  async function submit() {
    setError(null);
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user && firstName.trim()) {
      await supabase
        .from("profiles")
        .upsert({ id: auth.user.id, first_name: firstName.trim(), color: COLORS[firstName.trim().toLowerCase()] ?? "#C5B6F2" });
    }
    const { error } =
      mode === "create"
        ? await supabase.rpc("create_household", { p_name: name })
        : await supabase.rpc("accept_invitation", { p_code: code });
    setLoading(false);
    if (error) return setError(error.message);
    window.location.href = "/";
  }

  return (
    <div className="bg-grad-page min-h-dvh">
      <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-6">
        <div className="pt-10">
          <Wordmark />
          <h1 className="font-display mt-6 text-[30px] font-semibold leading-tight text-ink">Bienvenue dans TANDEM</h1>
          <p className="mt-1 text-muted">Créez votre espace à deux, ou rejoignez celui de votre partenaire.</p>
        </div>
        <Segmented
          className="mt-6"
          value={mode}
          onChange={setMode}
          options={[
            { value: "create", label: "Créer le foyer" },
            { value: "join", label: "Rejoindre" },
          ]}
        />
        <div className="mt-6 space-y-4">
          <Field label="Votre prénom">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </Field>
          {mode === "create" ? (
            <Field label="Nom du foyer">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
          ) : (
            <Field label="Code d'invitation" hint="Votre partenaire le trouve dans Profil → Partenaire.">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={`${inputClass} font-display text-center text-2xl tracking-[0.4em]`}
              />
            </Field>
          )}
          {error && <p className="text-sm font-medium text-over">{error}</p>}
        </div>
        <div className="mt-auto pt-6">
          <Button onClick={submit} disabled={loading || !firstName.trim() || (mode === "join" && code.length !== 6)}>
            {loading ? "Un instant…" : mode === "create" ? "Créer notre foyer" : "Rejoindre le foyer"}
          </Button>
        </div>
      </main>
    </div>
  );
}
