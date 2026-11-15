/** Crewboard mark: three cards moving across, the last one done (amber). */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#0a4743" />
      <rect x="6" y="8.5" width="12" height="4" rx="2" fill="#fff" />
      <rect x="10" y="14" width="12" height="4" rx="2" fill="#fff" opacity=".85" />
      <rect x="14" y="19.5" width="12" height="4" rx="2" fill="#fbbf24" />
    </svg>
  );
}
