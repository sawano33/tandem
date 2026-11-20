"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { logoFull, markBottom, markTop, wordWhite, WORD_H, WORD_LETTERS } from "@/lib/brand-assets";

const RATIO = 508 / 433;

/** Monogramme TANDEM : deux moitiés (pêche et lilas) qui s'emboîtent. */
export function LogoMark({ size = 30, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 ${animated ? "mark-anim" : ""} ${className}`} style={{ width: Math.round(size * RATIO), height: size }} aria-hidden>
      <img src={markTop} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
      <img src={markBottom} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
    </span>
  );
}

/** Lettres de « tandem », chacune dans sa propre boîte (pour les animer une par une). */
function Letters({ height, className }: { height: number; className: string }) {
  const k = height / WORD_H;
  return (
    <span className="flex items-end" style={{ height }} aria-hidden>
      {WORD_LETTERS.map(([x0, x1], i) => (
        <span key={i} className="block overflow-visible" style={{ width: (x1 - x0) * k, height }}>
          <span className={`block h-full overflow-hidden ${className}`} style={{ ["--i" as string]: i }}>
            <img src={wordWhite} alt="" draggable={false} style={{ height, width: "auto", maxWidth: "none", marginLeft: -x0 * k }} />
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Logo de la barre du haut, en boucle (6 s), comme MAISON :
 * le cercle se secoue et fait sortir les lettres une par une, une vague traverse le mot,
 * le cercle les ravale puis se retourne comme une carte, et ça recommence.
 */
export function LogoLoop({ size = 30, withWord = false }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2" role="img" aria-label="TANDEM">
      <LogoMark size={size} animated />
      {withWord && <Letters height={size * 0.8} className="letter-anim" />}
    </span>
  );
}

/** Logo complet statique : cercle + « tandem » en blanc */
export function Wordmark({ className = "", height = 40 }: { className?: string; height?: number }) {
  return <img src={logoFull} alt="tandem" className={className} style={{ height, width: "auto" }} draggable={false} />;
}

/**
 * Animation d'ouverture (à chaque lancement, pendant le chargement), comme MAISON :
 *  1. les deux moitiés du cercle arrivent chacune de leur côté et s'emboîtent (petit ressort),
 *  2. les lettres de « tandem » montent une par une, un trait pêche → lavande se dessine dessous,
 *  3. sortie : on plonge dans le cercle vers l'app.
 */
export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [played, setPlayed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPlayed(true), reduce ? 150 : 1900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!played || !ready) return;
    setLeaving(true);
    const t = setTimeout(onDone, 650);
    return () => clearTimeout(t);
  }, [played, ready, onDone]);

  const H = 30;
  return (
    <div className={`splash ${leaving ? "leaving" : ""}`} aria-hidden>
      <div className="flex flex-col items-center">
        <span className="splash-mark relative block" style={{ width: Math.round(120 * RATIO), height: 120 }}>
          <img src={markTop} alt="" className="splash-top absolute inset-0 h-full w-full" draggable={false} />
          <img src={markBottom} alt="" className="splash-bottom absolute inset-0 h-full w-full" draggable={false} />
        </span>
        <span className="splash-word mt-7">
          <Letters height={H} className="splash-letter" />
        </span>
        <span className="splash-rule mt-3.5" style={{ width: (WORD_LETTERS[5][1] / WORD_H) * H }} />
        <span className={`splash-loader ${played && !ready ? "show" : ""}`}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
