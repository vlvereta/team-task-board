import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../../api/errors';
import { BOARD_NAME_MAX_LENGTH } from '../../api/types';
import { useBoardData } from '../../app/BoardDataContext';
import { useToast } from '../../app/ToastContext';

/** Board title in the header; click (or Enter) to rename in place. */
export function BoardName() {
  const { board, renameBoard } = useBoardData();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!board) {
    return (
      <span
        className="h-6 w-40 animate-pulse rounded bg-white/20 motion-reduce:animate-none"
        aria-hidden="true"
      />
    );
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (saving) return;
    const name = draft.trim();
    if (!name || name === board!.name) {
      if (!name) toast.show('The board name cannot be empty.', 'error');
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await renameBoard(name);
      toast.show('Board renamed.', 'success');
      setEditing(false);
      requestAnimationFrame(() => buttonRef.current?.focus());
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="min-w-0 flex-1">
        <label htmlFor="board-name-input" className="sr-only">
          Board name
        </label>
        <input
          id="board-name-input"
          autoFocus
          value={draft}
          maxLength={BOARD_NAME_MAX_LENGTH}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
              requestAnimationFrame(() => buttonRef.current?.focus());
            }
          }}
          className="w-full min-h-touch max-w-md rounded-md bg-white px-2 text-lg font-bold text-slate-900 outline-3 outline-accent"
        />
      </form>
    );
  }

  return (
    <h1 className="min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setDraft(board.name);
          setEditing(true);
        }}
        className="focus-ring-light group flex min-h-touch max-w-full items-center gap-2 rounded-md px-2 text-left text-base font-bold text-white hover:bg-white/15 sm:text-lg"
        title="Rename board"
      >
        <span className="line-clamp-2 [overflow-wrap:anywhere]">{board.name}</span>
        <span className="sr-only">(rename board)</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4 shrink-0 opacity-60 group-hover:opacity-100"
          fill="currentColor"
        >
          <path d="M13.6 3.3a1.8 1.8 0 0 1 2.6 0l.5.5a1.8 1.8 0 0 1 0 2.6l-8.4 8.4-3.6.9.9-3.6 8-8.8Z" />
        </svg>
      </button>
    </h1>
  );
}
