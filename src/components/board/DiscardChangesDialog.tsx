import { ConfirmDialog } from '../ui/ConfirmDialog';

export function DiscardChangesDialog({
  onDiscard,
  onKeep,
}: {
  onDiscard: () => void;
  onKeep: () => void;
}) {
  return (
    <ConfirmDialog
      title="Discard unsaved changes?"
      message="You have edits that haven't been saved. If you close now, they will be lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={onDiscard}
      onCancel={onKeep}
    />
  );
}
