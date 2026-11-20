"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Delete, Lock } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IS_DEMO, DEMO_E, DEMO_G, setDemoUser } from "@/lib/demo";
import { Wordmark } from "@/components/Logo";
import { cx } from "@/components/ui";

const PEOPLE = [
  { key: "G", name: "Guillaume", email: process.env.NEXT_PUBLIC_EMAIL_GUILLAUME, demoId: DEMO_G, grad: "linear-gradient(140deg,#A9CBFF 0%,#7DB0F7 55%,#8B7FD1 100%)" },
  { key: "E", name: "Emma", email: process.env.NEXT_PUBLIC_EMAIL_EMMA, demoId: DEMO_E, grad: "linear-gradient(140deg,#FFC9DD 0%,#F5A3C7 55%,#FFAE97 100%)" },
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
  const [code, setCode] = useState("");
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
    if (code.length !== 6) return;
    if (!who.email) {
      setError(`L'e-mail de ${who.name} n'est pas configuré (voir README).`);
      return;
    }
    setLoading(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: who.email, password: code });
    setLoading(false);
    if (error) {
      setCode("");
      setError(/invalid/i.test(error.message) ? "Code incorrect." : "Connexion impossible. Réessayez.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const press = (k: string) => {
    setError(null);
    if (k === "del") setCode((c) => c.slice(0, -1));
    else if (code.length < 6) setCode((c) => c + k);
  };

  return (
    <div className="bg-grad-page min-h-dvh">
      <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-6">
        <div className="pt-10">
          <Wordmark />
          <p className="font-display mt-6 text-[34px] font-semibold leading-[1.1] text-ink">
            Deux vies.
            <br />
            <span className="text-grad italic">Un équilibre.</span>
          </p>
          <p className="mt-2 text-[15px] text-muted">Qui se connecte ?</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {PEOPLE.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setWho(p);
                setCode("");
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

        {who && !IS_DEMO && (
          <div className="animate-rise mt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted">
              <Lock size={14} /> Code de {who.name}
            </div>
            <div className="mt-3 flex justify-center gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={cx("h-3.5 w-3.5 rounded-full transition-colors", i < code.length ? "bg-ink" : "bg-track")} />
              ))}
            </div>
            {error && <p className="mt-2 text-center text-sm font-medium text-over">{error}</p>}
            <div className="mx-auto mt-4 grid max-w-72 grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
                k ? (
                  <button
                    key={i}
                    onClick={() => press(k)}
                    aria-label={k === "del" ? "Effacer" : k}
                    className="press flex h-14 items-center justify-center rounded-2xl bg-surface text-2xl font-medium text-ink"
                  >
                    {k === "del" ? <Delete size={22} /> : k}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          </div>
        )}
        {error && IS_DEMO && <p className="mt-3 text-center text-sm text-over">{error}</p>}

        <div className="mt-auto pt-6">
          <button
            onClick={signIn}
            disabled={!who || loading || (!IS_DEMO && code.length !== 6)}
            className="press bg-grad-night h-14 w-full rounded-2xl text-[17px] font-semibold text-white disabled:opacity-35"
          >
            {loading ? "Connexion…" : who ? `Se connecter en tant que ${who.name}` : "Se connecter"}
          </button>
          {IS_DEMO && <p className="mt-3 text-center text-xs text-muted">Mode démo : données fictives, rien n&apos;est enregistré.</p>}
        </div>
      </main>
    </div>
  );
}
