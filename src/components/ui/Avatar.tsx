import { initials } from '../../lib/initials';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  /** When false the avatar is decorative and the name is announced elsewhere. */
  labelled?: boolean;
}

export function Avatar({ name, color, size = 'sm', labelled = true }: AvatarProps) {
  const dims = size === 'sm' ? 'size-7 text-[0.6875rem]' : 'size-9 text-xs';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none tracking-wide text-white ring-2 ring-white ${dims}`}
      style={{ backgroundColor: color }}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? name : undefined}
      aria-hidden={labelled ? undefined : true}
      title={labelled ? name : undefined}
    >
      {initials(name)}
    </span>
  );
}
