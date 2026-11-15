import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, isApiError } from '../../api/errors';
import type { TaskStatus } from '../../api/types';
import { useAuth } from '../../app/AuthContext';
import { useBoardData } from '../../app/BoardDataContext';
import { useToast } from '../../app/ToastContext';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { COLUMN_TITLES } from './columns';
import { validateTaskDraft } from '../../lib/validation';
import { TaskFields } from './TaskFields';
import type { TaskDraft } from './TaskFields';

interface Props {
  status: TaskStatus;
  defaultAssigneeId: string;
  onClose: () => void;
}

export function CreateTaskDialog({ status, defaultAssigneeId, onClose }: Props) {
  const { user } = useAuth();
  const { users, createTask } = useBoardData();
  const toast = useToast();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<TaskDraft>({
    title: '',
    description: '',
    assigneeId: defaultAssigneeId,
    status,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = validateTaskDraft(draft);
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await createTask({
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        assigneeId: draft.assigneeId || null,
      });
      toast.show(`Added to ${COLUMN_TITLES[draft.status]}.`, 'success');
      onClose();
    } catch (err) {
      if (isApiError(err) && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`New task in ${COLUMN_TITLES[draft.status]}`}
      onClose={() => !busy && onClose()}
      initialFocusRef={titleRef}
      showClose
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
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
        </div>
        <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-slate-200 p-5 sm:mt-6 sm:px-6">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Create task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
