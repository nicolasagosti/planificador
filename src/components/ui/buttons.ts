// The three kinds of button of the mockups. All at least 44px high.

const primary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-button bg-ink font-semibold text-surface hover:bg-ink-hover disabled:cursor-wait disabled:bg-ink-hover";

/** Ink background: the main action of a screen. */
export const primaryButton = `${primary} px-4.5`;

/** The same, starting with an icon ("+ Nuevo cliente"). */
export const primaryIconButton = `${primary} pr-4.5 pl-3.5`;

const secondary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-button border-[1.5px] border-ink bg-surface font-semibold text-ink hover:bg-row-hover disabled:cursor-wait";

/** White with an ink border: secondary actions ("Editar datos"). */
export const secondaryButton = `${secondary} px-4`;

/** The same, starting with an icon ("Exportar para el cliente"). */
export const secondaryIconButton = `${secondary} pr-4 pl-3`;

/** Underlined text: quiet actions ("Archivar cliente", "Salir"). */
export const linkButton =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink underline underline-offset-3";
