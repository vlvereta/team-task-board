import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, isApiError } from '../../api/errors';
import type { Task } from '../../api/types';
import { useAuth } from '../../app/AuthContext';
import { useBoardData } from '../../app/BoardDataContext';
import { useToast } from '../../app/ToastContext';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { validateTaskDraft } from '../../lib/validation';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { TaskFields } from './TaskFields';
import type { TaskDraft } from './TaskFields';

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
};

function toDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId ?? '',
    status: task.status,
  };
}

export function TaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { user } = useAuth();
  const { users, updateTask, deleteTask } = useBoardData();
  const toast = useToast();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<TaskDraft>(() => toDraft(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const original = toDraft(task);
  const dirty =
    draft.title.trim() !== original.title ||
    draft.description !== original.description ||
    draft.assigneeId !== original.assigneeId ||
    draft.status !== original.status;

  // Set just before a deliberate close (after saving, deleting or discarding)
  // so the unsaved-changes guard lets that navigation through.
  const allowLeave = useRef(false);

  // X, Esc, backdrop and Cancel check for unsaved edits themselves (this does
  // not depend on browser history); browser Back is covered by the guard.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  function requestClose() {
    if (busy || confirming || confirmDiscard) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  function leave() {
    allowLeave.current = true;
    onClose();
  }

  const creator = users.find((u) => u.id === task.createdBy);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!dirty) {
      onClose();
      return;
    }
    const errs = validateTaskDraft(draft);
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await updateTask(task.id, {
        title: draft.title.trim(),
        description: draft.description,
        assigneeId: draft.assigneeId || null,
        status: draft.status,
        expectedUpdatedAt: task.updatedAt,
      });
      toast.show('Changes saved.', 'success');
      leave();
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setFormError(
          'Someone else changed this task after you opened it. The board now shows their version. Save again to replace it with yours, or cancel to keep theirs.',
        );
      } else if (isApiError(err) && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTask(task.id);
      toast.show(`Deleted "${task.title}".`, 'success');
      leave();
    } catch (err) {
      setDeleteError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog
        title="Edit task"
        onClose={requestClose}
        showClose
        closeLabel="Close task"
        returnFocus={() =>
          document.querySelector<HTMLElement>(
            `[data-testid="column-${task.status}"] [data-testid="task-card"], [data-testid="column-${task.status}"] button`,
          )
        }
      >
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-1 flex-col"
          aria-label="Edit task"
        >
          <div className="px-5 pt-4 sm:px-6">
            <TaskFields
              draft={draft}
              onChange={(d) => {
                setDraft(d);
                if (errors.title && d.title.trim()) setErrors(({ title: _t, ...rest }) => rest);
              }}
              users={users}
              currentUserId={user?.id}
              errors={errors}
              titleRef={titleRef}
              disabled={busy}
            />
            {formError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {formError}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-600">
              Created{creator ? ` by ${creator.name}` : ''} {fmt(task.createdAt)}
              {task.updatedAt !== task.createdAt && <> · Updated {fmt(task.updatedAt)}</>}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200 p-5 sm:mt-6 sm:px-6">
            <Button variant="danger-ghost" onClick={() => setConfirming(true)} disabled={busy}>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.1l.8 10.1A2 2 0 0 0 6.9 18h6.2a2 2 0 0 0 2-1.9L15.9 6h.1a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 2h2v0H9v0Zm-.5 4a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 8.5 8Zm3.75.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              Delete
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="secondary" onClick={requestClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" busy={busy} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
      {dirty && <UnsavedChangesGuard allow={() => allowLeave.current} />}
      {confirmDiscard && (
        <DiscardChangesDialog
          onDiscard={() => {
            setConfirmDiscard(false);
            leave();
          }}
          onKeep={() => setConfirmDiscard(false)}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title="Delete this task?"
          message={
            <>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                "{task.title}"
              </span>{' '}
              will be removed from the board for everyone. This cannot be undone.
            </>
          }
          confirmLabel="Delete task"
          onConfirm={() => void onDelete()}
          onCancel={() => {
            setConfirming(false);
            setDeleteError(null);
          }}
          busy={deleting}
          error={deleteError}
        />
      )}
    </>
  );
}
