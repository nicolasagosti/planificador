// Placeholder until phase 4 builds the Clientes screen.
export default function Home() {
  return (
    <main className="mx-auto max-w-page px-8 py-6">
      <p className="flex min-h-11 items-center gap-2.5 text-17 font-bold font-stretch-112% tracking-[-0.01em]">
        <span aria-hidden="true" className="flex gap-0.75">
          <span className="size-2.5 rounded-square-sm bg-pending shadow-[inset_0_0_0_1px_var(--color-pending-edge)]" />
          <span className="size-2.5 rounded-square-sm bg-done" />
          <span className="size-2.5 rounded-square-sm bg-delivered" />
        </span>
        Planificador
      </p>
    </main>
  );
}
