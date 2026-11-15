import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { DiscardChangesDialog } from './DiscardChangesDialog';

/**
 * While mounted: blocks in-app navigation (including browser Back/Forward) and
 * asks before discarding, and asks the browser to confirm leaving the page.
 * Render it only while there are unsaved changes: React Router warns about any
 * registered blocker when the address bar is edited by hand.
 */
export function UnsavedChangesGuard({ allow }: { allow: () => boolean }) {
  const blocker = useBlocker(() => !allow());

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!allow()) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [allow]);

  if (blocker.state !== 'blocked') return null;
  return (
    <DiscardChangesDialog onDiscard={() => blocker.proceed()} onKeep={() => blocker.reset()} />
  );
}
