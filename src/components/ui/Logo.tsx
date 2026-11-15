export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0a4743" />
      <rect x="6" y="7" width="5.5" height="18" rx="1.5" fill="#fff" />
      <rect x="13.25" y="7" width="5.5" height="12" rx="1.5" fill="#fff" opacity=".85" />
      <rect x="20.5" y="7" width="5.5" height="8" rx="1.5" fill="#fbbf24" />
    </svg>
  );
}
