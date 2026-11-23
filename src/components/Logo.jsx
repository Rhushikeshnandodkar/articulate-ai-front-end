/* "Voice A" brand mark: an A whose crossbar is a soundwave.
   Colors from the brand sheet: Ink #0E0F12, Accent #2F5BFF. */
export const BRAND_ACCENT = '#2F5BFF';

/**
 * The bare mark. The A follows the text color (ink in light mode, white in dark);
 * the soundwave bars use the brand blue.
 * variant="tile" draws the app-icon version: blue rounded square, white A and bars.
 */
export function LogoMark({ size = 28, variant = 'plain', className, title }) {
  const tile = variant === 'tile';
  const aColor = tile ? '#FFFFFF' : 'currentColor';
  const barColor = tile ? '#FFFFFF' : BRAND_ACCENT;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {tile && <rect width="64" height="64" rx="15" fill={BRAND_ACCENT} />}
      <g transform={tile ? 'translate(32 33) scale(0.72) translate(-32 -33)' : undefined}>
        <path d="M11 56 L32 9 L53 56" stroke={aColor} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27 37.5v6.5M32 33v15.5M37 37.5v6.5" stroke={barColor} strokeWidth="3.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Mark + "Articulate" wordmark (Inter Tight SemiBold, tight tracking). */
export function Logo({ size = 28, className, wordmark = true }) {
  return (
    <span className={`brand-logo ${className || ''}`} style={{ '--logo-size': `${size}px` }}>
      <LogoMark size={size} />
      {wordmark && <span className="brand-logo-word">Articulate</span>}
    </span>
  );
}
