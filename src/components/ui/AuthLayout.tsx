import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { LogoMark } from './Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Extra panel (the demo accounts): first on phones, beside the form on wider screens. */
  aside?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, aside }: AuthLayoutProps) {
  // After logging out (or any navigation that leaves focus on the page body),
  // start keyboard users at the page heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!document.activeElement || document.activeElement === document.body) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div className="min-h-dvh bg-board px-2 py-4 sm:px-4 sm:py-12">
      <main
        className={`mx-auto flex w-full flex-col gap-5 ${aside ? 'max-w-md md:max-w-4xl' : 'max-w-md'}`}
      >
        <div className="flex items-center gap-3 text-board-ink">
          <LogoMark className="size-10" />
          <span className="text-xl font-bold tracking-tight">Crewboard</span>
        </div>
        <div className={aside ? 'flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start' : ''}>
          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8 md:order-1">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-slate-900 outline-none"
            >
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          {aside && <div className="-order-1 md:order-2">{aside}</div>}
        </div>
      </main>
    </div>
  );
}
