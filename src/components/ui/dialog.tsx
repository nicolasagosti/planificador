"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A button that opens a modal dialog (native <dialog>: focus stays inside,
 * Escape closes it). Each opening mounts the content anew, so forms start
 * from their initial values and without old errors.
 */
export function Dialog({
  title,
  trigger,
  triggerClassName,
  children,
}: {
  title: string;
  trigger: ReactNode;
  triggerClassName: string;
  children: (close: () => void) => ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [opening, setOpening] = useState(0);
  const [closing, setClosing] = useState(0);
  const titleId = useId();

  // The native dialog opens and closes from effects: the content can ask to
  // close during an event without touching the element itself.
  useEffect(() => {
    if (opening > 0) dialogRef.current?.showModal();
  }, [opening]);
  useEffect(() => {
    if (closing > 0) dialogRef.current?.close();
  }, [closing]);

  const close = useCallback(() => setClosing((n) => n + 1), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpening((n) => n + 1)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog itself: close.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-button border-[1.5px] border-ink bg-surface p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex flex-col gap-5 p-6">
          <h2
            id={titleId}
            className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
          >
            {title}
          </h2>
          {opening > 0 && <Fragment key={opening}>{children(close)}</Fragment>}
        </div>
      </dialog>
    </>
  );
}
