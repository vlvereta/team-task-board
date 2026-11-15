import type { RefObject } from 'react';
import { DESCRIPTION_MAX_LENGTH, TASK_STATUSES, TITLE_MAX_LENGTH } from '../../api/types';
import type { TaskStatus, User } from '../../api/types';
import { SelectField, TextArea } from '../ui/Field';
import { COLUMN_TITLES } from './columns';

export interface TaskDraft {
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
}

interface TaskFieldsProps {
  draft: TaskDraft;
  onChange: (draft: TaskDraft) => void;
  users: User[];
  currentUserId: string | undefined;
  errors: Record<string, string>;
  titleRef?: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

export function TaskFields({
  draft,
  onChange,
  users,
  currentUserId,
  errors,
  titleRef,
  disabled,
}: TaskFieldsProps) {
  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => onChange({ ...draft, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <TextArea
        ref={titleRef}
        label="Title"
        required
        rows={2}
        maxLength={TITLE_MAX_LENGTH}
        value={draft.title}
        onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => {
          // Titles are single-line; Enter submits the form.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        error={errors.title}
        disabled={disabled}
        className="resize-none font-medium"
      />
      <TextArea
        label="Description"
        rows={5}
        maxLength={DESCRIPTION_MAX_LENGTH}
        value={draft.description}
        onChange={(e) => set('description', e.target.value)}
        error={errors.description}
        disabled={disabled}
        placeholder="Add more detail, links or acceptance notes…"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Assignee"
          value={draft.assigneeId}
          onChange={(e) => set('assigneeId', e.target.value)}
          error={errors.assigneeId}
          disabled={disabled}
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.id === currentUserId ? ' (you)' : ''}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(e) => set('status', e.target.value as TaskStatus)}
          error={errors.status}
          disabled={disabled}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {COLUMN_TITLES[s]}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
