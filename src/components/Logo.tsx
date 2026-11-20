/** Monogramme TANDEM : un « t » aubergine traversé d'une boucle pêche/lavande. */
export function LogoMark({ size = 28, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="tdm-peche" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FF8E73" />
          <stop offset="1" stopColor="#FFC2AE" />
        </linearGradient>
        <linearGradient id="tdm-lav" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#9F8AF0" />
          <stop offset="1" stopColor="#D9CEFA" />
        </linearGradient>
      </defs>
      {/* boucle lavande (arrière) */}
      <path
        d="M31 52 C31 34 36 20 47 16 C55 13 60 18 58 26"
        fill="none"
        stroke="url(#tdm-lav)"
        strokeWidth="9"
        strokeLinecap="round"
        pathLength={100}
        className={animated ? "logo-loop-b" : undefined}
      />
      {/* le t */}
      <path d="M21 7 V41 C21 50 26 55 35 55" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M8 23 H33" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      {/* boucle pêche (avant) */}
      <path
        d="M31 48 C31 31 37 18 48 15 C56 13 61 19 58 27"
        fill="none"
        stroke="url(#tdm-peche)"
        strokeWidth="8"
        strokeLinecap="round"
        pathLength={100}
        className={animated ? "logo-loop-a" : undefined}
      />
    </svg>
  );
}

/** Logo animé en boucle, identique sur tous les écrans (en haut à gauche). */
export function LogoLoop({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0" aria-label="TANDEM">
      <LogoMark size={size} animated className="text-ink" />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark size={30} animated className="text-ink" />
      <span className="font-display text-[26px] font-semibold tracking-tight text-ink">tandem</span>
    </span>
  );
}
