import { useId } from 'react';

/**
 * BeetLogo — the BEET brand mark: a dimensional sugar-beet root with leaves.
 * Purely presentational. Gradient IDs are namespaced via useId so multiple
 * instances on a page never collide.
 */
function BeetLogo({ size = 40, className = '' }) {
  const id = useId().replace(/:/g, '');
  const root = `root-${id}`;
  const leaf = `leaf-${id}`;
  const leaf2 = `leaf2-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={root} x1="20" y1="18" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C24A86" />
          <stop offset="0.55" stopColor="#A8316A" />
          <stop offset="1" stopColor="#7E1F4F" />
        </linearGradient>
        <linearGradient id={leaf} x1="26" y1="2" x2="40" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4CA772" />
          <stop offset="1" stopColor="#2E7D52" />
        </linearGradient>
        <linearGradient id={leaf2} x1="14" y1="6" x2="30" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3E9A66" />
          <stop offset="1" stopColor="#256B45" />
        </linearGradient>
      </defs>
      <path d="M32 24C31 14 26 7 17 5c-1.2-.3-2.2.9-1.7 2 3 6.6 6.3 12 16.7 17Z" fill={`url(#${leaf2})`} />
      <path d="M32 24C33.5 12 39 5 49 4c1.3-.1 2 1.2 1.3 2.3C46.8 12 42.5 18 32 24Z" fill={`url(#${leaf})`} />
      <path d="M32 21c10 0 17 7 17 16 0 10-8 22-17 22s-17-12-17-22c0-9 7-16 17-16Z" fill={`url(#${root})`} />
      <path d="M32 57c1.4 2.6 1.6 4.2 1.2 5.4-.4 1.1-2 1.1-2.4 0-.4-1.2-.2-2.8 1.2-5.4Z" fill="#7E1F4F" />
      <ellipse cx="25.5" cy="32" rx="4" ry="6.5" fill="#FFFFFF" opacity="0.22" />
    </svg>
  );
}

export default BeetLogo;
