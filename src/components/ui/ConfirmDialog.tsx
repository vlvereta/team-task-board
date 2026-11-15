import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy,
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title={title}
      description={message}
      onClose={() => !busy && onCancel()}
      initialFocusRef={cancelRef}
      size="sm"
      role="alertdialog"
    >
      {error && (
        <p
          role="alert"
          className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6"
        >
          {error}
        </p>
      )}
      <div className="mt-auto flex flex-col-reverse gap-2 p-5 sm:mt-0 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
