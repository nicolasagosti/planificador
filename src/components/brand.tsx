import Link from "next/link";

/** "Planificador" with its three squares, linking to the Clientes screen. */
export function Brand() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2.5 text-17 font-bold font-stretch-112% tracking-[-0.01em] text-ink no-underline"
    >
      <span aria-hidden="true" className="flex gap-0.75">
        <span className="size-2.5 rounded-square-sm bg-pending shadow-[inset_0_0_0_1px_var(--color-pending-edge)]" />
        <span className="size-2.5 rounded-square-sm bg-done" />
        <span className="size-2.5 rounded-square-sm bg-delivered" />
      </span>
      <span>Planificador</span>
    </Link>
  );
}
