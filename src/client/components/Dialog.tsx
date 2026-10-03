import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';
interface Props {
  id: string;
  titleId: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}
export function Dialog({id, titleId, onClose, busy = false, children}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          onClose();
      }}
    >
      <button className="close" aria-label="Close dialog" disabled={busy} onClick={onClose}>
        ×
      </button>
      {children}
    </dialog>
  );
}
