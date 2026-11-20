/* eslint-disable @next/next/no-img-element */
import { logoFull, markSwoosh, markT } from "@/lib/brand-assets";

/** Monogramme officiel TANDEM (le « t » lilas et la boucle pêche), avec option animée en boucle. */
export function LogoMark({ size = 30, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const w = Math.round(size * (351 / 292));
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: w, height: size }} aria-hidden>
      <img src={markT} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
      <img src={markSwoosh} alt="" className={`absolute inset-0 h-full w-full ${animated ? "logo-swoosh" : ""}`} draggable={false} />
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

/** Logo complet « tandem » */
export function Wordmark({ className = "", height = 40 }: { className?: string; height?: number }) {
  return <img src={logoFull} alt="tandem" className={className} style={{ height, width: "auto" }} draggable={false} />;
}
