import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../app/AuthContext';
import { errorMessage, isApiError } from '../api/errors';
import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../api/types';
import { lengthHint, validateSignup } from '../lib/validation';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';

export function SignupPage() {
  const { register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function focusFirst(errs: Record<string, string>) {
    const target = errs.name ? nameRef : errs.email ? emailRef : errs.password ? passwordRef : null;
    target?.current?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const errs = validateSignup(values);
    setFields(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    setBusy(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
    } catch (e) {
      if (isApiError(e) && e.code === 'conflict') {
        const errs2 = { email: 'An account with this email already exists. Sign in instead?' };
        setFields(errs2);
        focusFirst(errs2);
      } else if (isApiError(e) && Object.keys(e.fields).length) {
        setFields(e.fields);
        focusFirst(e.fields);
      } else {
        setError(errorMessage(e));
      }
      setBusy(false);
    }
  }

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (fields[k]) setFields(({ [k]: _removed, ...rest }) => rest);
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join your team's board in a few seconds.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          ref={nameRef}
          label="Name"
          autoComplete="name"
          value={values.name}
          onChange={set('name')}
          error={fields.name}
          hint={lengthHint(values.name.length, NAME_MAX_LENGTH)}
          maxLength={NAME_MAX_LENGTH}
        />
        <TextField
          ref={emailRef}
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={fields.email}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={fields.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          >
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-700">
        Already have an account?{' '}
        <Link
          to="/login"
          className="focus-ring inline-flex min-h-touch items-center rounded px-1 font-semibold text-brand underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
