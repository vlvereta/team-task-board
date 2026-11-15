export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="focus-ring inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="currentColor">
        <path d="M5.3 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.7 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.3 4.3Z" />
      </svg>
    </button>
  );
}
