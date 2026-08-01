function BrandLogo({ size = 96, glow = true }) {
  return (
    <svg
      className={glow ? "sp-logo is-glow" : "sp-logo"}
      width={size}
      height={size * 0.78}
      viewBox="0 0 128 100"
      fill="none"
      aria-label="SOMPO TEAM"
    >
      <defs>
        <linearGradient id="sompoLogoLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </linearGradient>
        <linearGradient id="sompoLogoPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c22ce" />
        </linearGradient>
      </defs>

      {/* headphone band */}
      <path
        d="M18 68V52C18 27.7 38.6 8 64 8s46 19.7 46 44v16"
        stroke="url(#sompoLogoLight)"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* ear cups */}
      <rect x="8" y="56" width="22" height="38" rx="11" fill="url(#sompoLogoLight)" />
      <rect x="98" y="56" width="22" height="38" rx="11" fill="url(#sompoLogoLight)" />

      {/* people */}
      <circle cx="64" cy="55" r="10" fill="url(#sompoLogoPurple)" />
      <path d="M46 90c0-10.5 8-18 18-18s18 7.5 18 18z" fill="url(#sompoLogoPurple)" />
      <circle cx="44" cy="62" r="7.5" fill="url(#sompoLogoPurple)" />
      <path d="M31 90c0-8 5.8-14 13-14 2 0 3.9.5 5.6 1.3A24 24 0 0 0 44 90z" fill="url(#sompoLogoPurple)" />
      <circle cx="84" cy="62" r="7.5" fill="url(#sompoLogoPurple)" />
      <path d="M97 90c0-8-5.8-14-13-14-2 0-3.9.5-5.6 1.3A24 24 0 0 1 84 90z" fill="url(#sompoLogoPurple)" />
    </svg>
  );
}

export function BrandWordmark({ size = "lg", tagline = true }) {
  return (
    <div className={`sp-wordmark sp-wordmark--${size}`}>
      <h1>
        SOMPO<span>TEAM</span>
      </h1>
      {tagline && <p>MUSIC. CHAT. CONNECT.</p>}
    </div>
  );
}

export default BrandLogo;
