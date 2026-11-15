import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { errorMessage, isApiError } from '../api/errors';
import { BOARD_NAME_MAX_LENGTH, NAME_MAX_LENGTH } from '../api/types';
import { useAuth } from '../app/AuthContext';
import { useBoardData } from '../app/BoardDataContext';
import { useToast } from '../app/ToastContext';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TextField } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { lengthHint } from '../lib/validation';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6"
    >
      <h2 id={id} className="text-base font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NameForm({
  label,
  initial,
  maxLength,
  onSave,
  savedMessage,
}: {
  label: string;
  initial: string;
  maxLength: number;
  onSave: (value: string) => Promise<void>;
  savedMessage: string;
}) {
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const dirty = value.trim() !== initial;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !dirty) return;
    if (!value.trim()) {
      setError(`${label} cannot be empty.`);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onSave(value.trim());
      setValue(value.trim());
      toast.show(savedMessage, 'success');
    } catch (err) {
      setError(isApiError(err) ? (Object.values(err.fields)[0] ?? err.message) : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <TextField
          label={label}
          value={value}
          maxLength={maxLength}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          error={error}
          hint={lengthHint(value.length, maxLength)}
        />
      </div>
      <Button type="submit" busy={busy} disabled={!dirty} className="sm:mt-[1.625rem]">
        Save
      </Button>
    </form>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { status, board, loadError, reload, renameBoard, updateMyName, resetDemo } = useBoardData();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function onReset() {
    setResetting(true);
    setResetError(null);
    try {
      if (await resetDemo()) {
        setConfirmReset(false);
        toast.show('Demo data restored.', 'success');
      }
    } catch (err) {
      setResetError(errorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-panel" aria-labelledby="settings-title">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-2 py-4 sm:px-4 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="settings-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>
          <Link
            to="/board"
            className="focus-ring -mx-3 inline-flex min-h-touch items-center gap-1 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-teal-50"
          >
            <span aria-hidden="true">←</span> Back to board
          </Link>
        </div>

        {status === 'loading' && (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-700">
            <Spinner className="size-4 text-brand" /> Loading settings…
          </p>
        )}
        {status === 'error' && (
          <div role="alert" className="rounded-xl bg-white p-5 text-sm text-slate-800 shadow-sm">
            <p>{loadError}</p>
            <Button className="mt-3" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && user && board && (
          <>
            <Section
              title="Your profile"
              description="This is how teammates see you on cards and in the assignee list."
            >
              <NameForm
                key={`me-${user.name}`}
                label="Display name"
                initial={user.name}
                maxLength={NAME_MAX_LENGTH}
                onSave={updateMyName}
                savedMessage="Display name updated."
              />
              <p className="mt-3 text-xs text-slate-600">Signed in as {user.email}</p>
            </Section>
            <Section
              title="Board"
              description="The board name is shown in the header for the whole team."
            >
              <NameForm
                key={`board-${board.name}`}
                label="Board name"
                initial={board.name}
                maxLength={BOARD_NAME_MAX_LENGTH}
                onSave={renameBoard}
                savedMessage="Board renamed."
              />
            </Section>
            <Section
              title="Demo data"
              description="Put the board, tasks and the five demo accounts back to how they were on your first visit. Accounts created since will be removed."
            >
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                Reset demo data
              </Button>
            </Section>
          </>
        )}
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Reset demo data?"
          message="All changes to the board, tasks and accounts will be replaced with the original demo data. If you signed up yourself, you will be signed out."
          confirmLabel="Reset demo data"
          onConfirm={() => void onReset()}
          onCancel={() => {
            setConfirmReset(false);
            setResetError(null);
          }}
          busy={resetting}
          error={resetError}
        />
      )}
    </main>
  );
}
