import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../app/AuthContext';
import { errorMessage, isApiError } from '../api/errors';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../demoAccounts';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // 'form' | demo email

  async function signIn(creds: { email: string; password: string }, source: string) {
    if (busy) return;
    setBusy(source);
    setError(null);
    clearNotice();
    try {
      await login(creds);
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'invalid_credentials'
          ? 'Incorrect email or password.'
          : errorMessage(e),
      );
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    void signIn({ email: email.trim(), password }, 'form');
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Pick up where your team left off.">
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          {notice}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          >
            {error}
          </p>
        )}
        <Button type="submit" busy={busy === 'form'} disabled={!!busy} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-700">
        New here?{' '}
        <Link
          to="/signup"
          className="focus-ring rounded font-semibold text-brand underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <section aria-labelledby="demo-heading" className="mt-6 border-t border-slate-200 pt-5">
        <h2 id="demo-heading" className="text-sm font-semibold text-slate-900">
          Try a demo account
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          One click signs you in. Every demo account uses the password{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-800">
            {DEMO_PASSWORD}
          </code>
          .
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => void signIn({ email: a.email, password: DEMO_PASSWORD }, a.email)}
                disabled={!!busy}
                aria-label={`Sign in as ${a.name}, ${a.role}`}
                className="focus-ring flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-2 text-left ring-1 ring-slate-200 transition-colors hover:bg-teal-50 hover:ring-teal-300 disabled:opacity-60"
              >
                <Avatar name={a.name} color={a.avatarColor} labelled={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {a.name}
                  </span>
                  <span className="block truncate text-xs text-slate-600">
                    {a.role} · {a.email}
                  </span>
                </span>
                {busy === a.email ? (
                  <Spinner className="size-4 text-brand" />
                ) : (
                  <span aria-hidden="true" className="text-sm font-semibold text-brand">
                    Sign in
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AuthLayout>
  );
}
