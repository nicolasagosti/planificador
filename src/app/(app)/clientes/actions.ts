"use server";

import { and, eq } from "drizzle-orm";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clients } from "@/db/schema";
import {
  clientInputSchema,
  idSchema,
  type ClientInput,
} from "@/domain/schemas";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";

export type ClientField = keyof ClientInput;

export type ClientFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ClientField, string>> }
  | { status: "failed"; message: string }
  | { status: "saved" };

function readForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  };
  // "Cliente desde" comes as two selects: month and year.
  const month = text("clientSinceMonth") || null;
  const year = text("clientSinceYear") || null;
  return {
    input: {
      name: text("name") ?? "",
      industry: text("industry"),
      contactName: text("contactName"),
      contactPhone: text("contactPhone"),
      networks: formData
        .getAll("networks")
        .filter((value): value is string => typeof value === "string"),
      approvalNotes: text("approvalNotes"),
      notes: text("notes"),
      clientSince: month && year ? `${year}-${month}` : null,
    },
    partialMonth: Boolean(month) !== Boolean(year),
  };
}

function validate(
  formData: FormData,
):
  | { ok: true; data: ClientInput }
  | { ok: false; errors: Partial<Record<ClientField, string>> } {
  const { input, partialMonth } = readForm(formData);
  const parsed = clientInputSchema.safeParse(input);
  const errors: Partial<Record<ClientField, string>> = {};
  for (const issue of parsed.error?.issues ?? []) {
    const field = issue.path[0];
    if (typeof field === "string" && field in input && !(field in errors)) {
      errors[field as ClientField] = issue.message;
    }
  }
  if (partialMonth) {
    errors.clientSince = "Elegí el mes y el año, o dejá los dos vacíos.";
  }
  if (!parsed.success || partialMonth) return { ok: false, errors };
  return { ok: true, data: parsed.data };
}

export async function createClient(
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const user = await requireUser();
  const result = validate(formData);
  if (!result.ok) return { status: "invalid", errors: result.errors };

  const [client] = await getDb()
    .insert(clients)
    .values({ ...result.data, userId: user.id })
    .returning({ id: clients.id });
  if (!client) {
    return {
      status: "failed",
      message: "No pudimos crear el cliente. Probá de nuevo.",
    };
  }
  revalidatePath("/");
  redirect(`/clientes/${client.id}` as Route);
}

export async function updateClient(
  clientId: string,
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(clientId);
  if (!id.success)
    return { status: "failed", message: "No encontramos ese cliente." };
  const result = validate(formData);
  if (!result.ok) return { status: "invalid", errors: result.errors };

  const updated = await getDb()
    .update(clients)
    .set(result.data)
    .where(and(eq(clients.id, id.data), eq(clients.userId, user.id)))
    .returning({ id: clients.id });
  if (updated.length === 0) {
    return { status: "failed", message: "No encontramos ese cliente." };
  }
  revalidatePath("/");
  revalidatePath(`/clientes/${id.data}`);
  return { status: "saved" };
}
