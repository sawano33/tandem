/* eslint-disable @next/next/no-img-element */
import { logoFull, markBottom, markTop } from "@/lib/brand-assets";

const RATIO = 702 / 679;

/** Monogramme TANDEM : deux moitiés (pêche et lilas) qui s'emboîtent. Animé : elles s'écartent puis se rejoignent. */
export function LogoMark({ size = 30, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: Math.round(size * RATIO), height: size }} aria-hidden>
      <img src={markTop} alt="" className={`absolute inset-0 h-full w-full ${animated ? "logo-top" : ""}`} draggable={false} />
      <img src={markBottom} alt="" className={`absolute inset-0 h-full w-full ${animated ? "logo-bottom" : ""}`} draggable={false} />
    </span>
  );
}

/** Logo animé, identique sur tous les écrans (en haut à gauche). */
export function LogoLoop({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0" role="img" aria-label="TANDEM">
      <LogoMark size={size} animated />
    </span>
  );
}

/** Logo complet : cercle + « tandem » en blanc */
export function Wordmark({ className = "", height = 40 }: { className?: string; height?: number }) {
  return <img src={logoFull} alt="tandem" className={className} style={{ height, width: "auto" }} draggable={false} />;
}
