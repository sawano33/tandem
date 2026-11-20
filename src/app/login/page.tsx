"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IS_DEMO, DEMO_E, DEMO_G, setDemoUser } from "@/lib/demo";
import { Wordmark } from "@/components/Logo";
import { cx } from "@/components/ui";
import { ArrowRight, Check } from "lucide-react";

const PEOPLE = [
  { key: "G", name: "Guillaume", demoId: DEMO_G, grad: "linear-gradient(145deg,#EDE6FD 0%,#C5B6F2 60%,#A897EA 100%)" },
  { key: "E", name: "Emma", demoId: DEMO_E, grad: "linear-gradient(145deg,#FFE0D5 0%,#FFAE97 60%,#F59C8A 100%)" },
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
        {/* Marque */}
        <div className="stagger flex flex-1 flex-col items-center justify-center pt-10 text-center">
          <Wordmark height={56} />
          <p className="font-display mt-4 text-[21px] font-medium italic text-ink/85">Deux vies. Un équilibre.</p>

          {/* Choix du profil */}
          <p className="mt-14 text-[14px] font-medium text-muted">Qui se connecte ?</p>
          <div className="mt-6 flex items-start justify-center gap-10" role="radiogroup" aria-label="Profil">
            {PEOPLE.map((p) => {
              const on = who?.key === p.key;
              return (
                <button
                  key={p.key}
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setWho(p);
                    setError(null);
                  }}
                  className={cx("group flex flex-col items-center gap-3 transition-opacity duration-300", who && !on && "opacity-40")}
                >
                  <span
                    className={cx(
                      "relative flex h-[104px] w-[104px] items-center justify-center rounded-full transition-transform duration-300 ease-out",
                      on ? "scale-105" : "group-active:scale-95",
                    )}
                    style={{ background: p.grad }}
                  >
                    <span className="font-num text-[42px] font-semibold text-aubergine">{p.key}</span>
                    <span
                      className={cx(
                        "pointer-events-none absolute -inset-[7px] rounded-full border-2 transition-all duration-300",
                        on ? "border-lilas opacity-100" : "border-transparent opacity-0",
                      )}
                    />
                    {on && (
                      <span className="animate-fade absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-lilas text-aubergine ring-4 ring-bg">
                        <Check size={17} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className={cx("text-[16px] font-semibold", on ? "text-ink" : "text-ink/80")}>{p.name}</span>
                </button>
              );
            })}
          </div>
          {error && <p className="mt-6 text-sm font-medium text-over">{error}</p>}
        </div>

        {/* Action */}
        <div className="pb-4 pt-8">
          <button
            onClick={signIn}
            disabled={!who || loading}
            className={cx(
              "press flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold transition-colors duration-300",
              who ? "bg-grad-cta text-aubergine" : "bg-surface text-muted",
            )}
          >
            {loading ? "Connexion…" : who ? <>Continuer en tant que {who.name} <ArrowRight size={18} /></> : "Choisis ton profil"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            {IS_DEMO ? "Mode démo : données fictives, rien n'est enregistré." : "Ton choix est retenu sur cet appareil."}
          </p>
        </div>
      </main>
    </div>
  );
}
