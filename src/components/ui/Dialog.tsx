import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from './CloseButton';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: ReactNode;
  /** Visually hide the title (it is still the dialog's accessible name). */
  hideTitle?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Element to focus first; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: 'sm' | 'lg';
  role?: 'dialog' | 'alertdialog';
  description?: ReactNode;
  /** Show an X button in the header. */
  showClose?: boolean;
  closeLabel?: string;
}

/**
 * Modal dialog: traps focus, closes on Escape and on backdrop click, restores
 * focus to the opener, and becomes a full-screen sheet on narrow screens.
 */
export function Dialog({
  title,
  hideTitle,
  onClose,
  children,
  initialFocusRef,
  size = 'lg',
  role = 'dialog',
  description,
  showClose = false,
  closeLabel = 'Close',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      // Return focus to whatever opened the dialog, if it is still on the page.
      if (opener && document.contains(opener)) opener.focus();
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    e.stopPropagation();
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const width = size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-2xl';

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-center bg-slate-950/55 motion-safe:animate-[fade-in_120ms_ease-out] sm:items-start sm:overflow-y-auto sm:p-6 sm:pt-[8vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`relative flex w-full flex-col overflow-y-auto bg-white shadow-xl outline-none motion-safe:animate-[dialog-in_160ms_ease-out] max-sm:min-h-full sm:rounded-xl ${width}`}
      >
        <div className={`flex items-start gap-3 px-5 sm:px-6 ${showClose ? 'pt-3' : 'pt-5'}`}>
          <h2
            id={titleId}
            className={
              hideTitle
                ? 'sr-only'
                : `min-w-0 flex-1 text-lg font-semibold text-slate-900 ${showClose ? 'pt-2' : ''}`
            }
          >
            {title}
          </h2>
          {showClose && (
            <div className="-mr-2 ml-auto">
              <CloseButton onClick={() => onCloseRef.current()} label={closeLabel} />
            </div>
          )}
        </div>
        {description && (
          <div id={descId} className="px-5 pt-2 text-sm text-slate-700 sm:px-6">
            {description}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
