interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Lumen"
      className={className}
    >
      <defs>
        <linearGradient id="lumen-door-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#4364e8" />
          <stop offset="25%" stopColor="#5e77ed" />
          <stop offset="50%" stopColor="#9868e4" />
          <stop offset="75%" stopColor="#db5592" />
          <stop offset="100%" stopColor="#f45d75" />
        </linearGradient>
        <linearGradient id="lumen-top-warmth" x1="50%" y1="0%" x2="50%" y2="70%">
          <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.75" />
          <stop offset="35%" stopColor="#fca5a5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4364e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 18 84 A 6 6 0 0 0 24 90 L 76 90 A 6 6 0 0 0 82 84 L 82 44 A 32 32 0 0 0 18 44 Z"
        fill="url(#lumen-door-gradient)"
      />
      <path
        d="M 18 84 A 6 6 0 0 0 24 90 L 76 90 A 6 6 0 0 0 82 84 L 82 44 A 32 32 0 0 0 18 44 Z"
        fill="url(#lumen-top-warmth)"
      />
    </svg>
  );
}

