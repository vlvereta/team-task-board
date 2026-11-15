import type { ReactNode } from 'react';
import { LogoMark } from './Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-board px-4 py-8 sm:py-12">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3 text-board-ink">
          <LogoMark className="size-10" />
          <span className="text-xl font-bold tracking-tight">Crewboard</span>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
