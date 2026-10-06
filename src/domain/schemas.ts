// Input validation (docs/SPEC.md, section 3). The Server Actions enforce it;
// the forms reuse it for comfort. Messages are shown in the interface.
import { z } from "zod";
import { FORMATS, NETWORKS, type Network } from "./catalog";
import {
  firstDayOf,
  isMonthKey,
  monthOf,
  monthOfYear,
  type MonthKey,
} from "./dates";
import { isCalendarDay } from "./today";

/** Optional text: trimmed, and an empty value becomes null. */
function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => (value ? value : null));
}

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export const idSchema = z.uuid({ error: "No encontramos lo que buscabas." });

export const clientInputSchema = z.object({
  name: z
    .string({ error: "Escribí el nombre del cliente." })
    .trim()
    .min(1, "Escribí el nombre del cliente.")
    .max(120, "El nombre puede tener hasta 120 caracteres."),
  industry: optionalText(120, "El rubro puede tener hasta 120 caracteres."),
  contactName: optionalText(
    120,
    "El contacto puede tener hasta 120 caracteres.",
  ),
  contactPhone: optionalText(
    40,
    "El teléfono puede tener hasta 40 caracteres.",
  ),
  // In the catalog's order, without repeats.
  networks: z
    .array(z.enum(NETWORKS, { error: "Elegí redes de la lista." }))
    .default([])
    .transform((codes): Network[] =>
      NETWORKS.filter((network) => codes.includes(network)),
    ),
  approvalNotes: optionalText(
    1000,
    "Cómo aprueba puede tener hasta 1000 caracteres.",
  ),
  notes: optionalText(2000, "Las notas pueden tener hasta 2000 caracteres."),
  // A month ("YYYY-MM"), stored as its first day.
  clientSince: z
    .string()
    .trim()
    .nullish()
    .refine((value) => !value || isMonthKey(value), "Elegí un mes válido.")
    .transform((value) => (value ? firstDayOf(value) : null)),
});
export type ClientInput = z.output<typeof clientInputSchema>;

/** A piece of the calendar of `month`: its date must fall inside it. */
export function pieceInputSchema(month: MonthKey) {
  return z.object({
    date: z
      .string({ error: "Elegí la fecha." })
      .refine(isCalendarDay, { error: "Elegí una fecha válida.", abort: true })
      .refine(
        (day) => monthOf(day) === month,
        `La fecha tiene que ser de ${monthOfYear(month)}.`,
      ),
    network: z.enum(NETWORKS, { error: "Elegí la red." }),
    format: z.enum(FORMATS, { error: "Elegí el formato." }),
    topic: z
      .string({ error: "Escribí el tema." })
      .trim()
      .min(1, "Escribí el tema.")
      .max(120, "El tema puede tener hasta 120 caracteres."),
    idea: optionalText(2000, "La idea puede tener hasta 2000 caracteres."),
  });
}
export type PieceInput = z.output<ReturnType<typeof pieceInputSchema>>;

/** The file link of a piece. An empty link removes it, and its name too. */
export const assetInputSchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(2000, "El link es demasiado largo.")
      .nullish()
      .transform((value) => (value ? value : null))
      .refine(
        (value) => value === null || isHttpUrl(value),
        "Pegá un link que empiece con http:// o https://.",
      ),
    name: optionalText(200, "El nombre puede tener hasta 200 caracteres."),
  })
  .transform((value) => (value.url ? value : { url: null, name: null }));
export type AssetInput = z.output<typeof assetInputSchema>;
