"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IS_DEMO, DEMO_E, DEMO_G, setDemoUser } from "@/lib/demo";
import { Wordmark } from "@/components/Logo";
import { cx } from "@/components/ui";

const PEOPLE = [
  { key: "G", name: "Guillaume", demoId: DEMO_G, grad: "linear-gradient(140deg,#E1D6FB 0%,#C5B6F2 55%,#9583E0 100%)" },
  { key: "E", name: "Emma", demoId: DEMO_E, grad: "linear-gradient(140deg,#FFD0BF 0%,#FFAE97 55%,#F3A9C8 100%)" },
];

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [who, setWho] = useState<(typeof PEOPLE)[number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!who) return;
    setError(null);
    if (IS_DEMO) {
      setDemoUser(who.demoId);
      router.replace(next);
      return;
    }
    // Comme MAISON : connexion en un geste, sans e-mail ni mot de passe (fonction Supabase « tandem-login »)
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb.functions.invoke("tandem-login", { body: { who: who.key } });
      if (error || !data?.access_token) throw error ?? new Error(data?.error ?? "login_failed");
      const r = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (r.error) throw r.error;
      try {
        localStorage.setItem("tandem.lastWhoLogin", who.key);
      } catch {}
    } catch {
      setLoading(false);
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="bg-grad-page min-h-dvh">
      <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-6">
        <div className="pt-10">
          <Wordmark height={52} />
          <p className="font-display mt-5 text-[30px] font-medium italic leading-[1.1] text-ink">Deux vies. Un équilibre.</p>
          <p className="mt-2 text-[15px] text-muted">Qui se connecte ?</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {PEOPLE.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setWho(p);
                setError(null);
              }}
              className={cx(
                "press relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[28px] p-4 text-left text-aubergine transition-all",
                who && who.key !== p.key && "scale-[0.96] opacity-40",
                who?.key === p.key && "ring-4 ring-aubergine/80 dark:ring-lilas",
              )}
              style={{ background: p.grad }}
            >
              <span className="font-display text-[64px] font-semibold leading-none">{p.key}</span>
              <span className="text-lg font-semibold">{p.name}</span>
              <svg viewBox="0 0 100 100" className="absolute -bottom-6 -right-6 h-28 w-28 opacity-30" aria-hidden>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="14" />
              </svg>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm font-medium text-over">{error}</p>}

        <div className="mt-auto pt-6">
          <button
            onClick={signIn}
            disabled={!who || loading}
            className="press bg-grad-cta h-14 w-full rounded-2xl text-[17px] font-semibold text-aubergine disabled:opacity-35"
          >
            {loading ? "Connexion…" : who ? `Se connecter en tant que ${who.name}` : "Se connecter"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            {IS_DEMO ? "Mode démo : données fictives, rien n'est enregistré." : "Ton choix est retenu sur cet appareil."}
          </p>
        </div>
      </main>
    </div>
  );
}
