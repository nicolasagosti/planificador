"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  ClientField,
  ClientFormState,
} from "@/app/(app)/clientes/actions";
import { PlusIcon } from "@/components/icons";
import { NETWORK_LABELS, NETWORKS } from "@/domain/catalog";
import { MONTHS } from "@/domain/dates";

export type ClientFormValues = {
  name: string;
  industry: string | null;
  contactName: string | null;
  contactPhone: string | null;
  networks: string[];
  approvalNotes: string | null;
  notes: string | null;
  /** First day of the month, or null. */
  clientSince: string | null;
};

type ClientAction = (
  state: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

type Props = {
  mode: "create" | "edit";
  action: ClientAction;
  initial?: ClientFormValues;
  /** Latest year offered for "Cliente desde". */
  currentYear: number;
};

const fieldClass =
  "min-h-11 w-full rounded-button border border-hollow bg-surface px-3 text-15 text-ink focus-visible:border-ink aria-invalid:border-ink";

/** "Nuevo cliente" or "Editar datos": a button that opens the client form. */
export function ClientFormDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Each opening mounts a fresh form, with the saved values and no old errors.
  const [opening, setOpening] = useState(0);
  const titleId = useId();

  useEffect(() => {
    if (opening > 0) dialogRef.current?.showModal();
  }, [opening]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      {props.mode === "create" ? (
        <button
          type="button"
          onClick={() => setOpening((n) => n + 1)}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-button bg-ink pr-4.5 pl-3.5 font-semibold text-surface hover:bg-ink-hover"
        >
          <PlusIcon />
          <span>Nuevo cliente</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpening((n) => n + 1)}
          className="min-h-11 cursor-pointer rounded-button border-[1.5px] border-ink bg-surface px-4 font-semibold hover:bg-row-hover"
        >
          Editar datos
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog itself: close.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto w-[min(36rem,calc(100vw-2rem))] rounded-button border-[1.5px] border-ink bg-surface p-0 text-ink backdrop:bg-ink/40"
      >
        {opening > 0 && (
          <ClientForm
            key={opening}
            {...props}
            titleId={titleId}
            onClose={close}
          />
        )}
      </dialog>
    </>
  );
}

function ClientForm({
  mode,
  action,
  initial,
  currentYear,
  titleId,
  onClose,
}: Props & { titleId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "saved") onClose();
  }, [state, onClose]);

  const errors: Partial<Record<ClientField, string>> =
    state.status === "invalid" ? state.errors : {};

  // Submitted from onSubmit, not as the form's action, so React does not
  // reset the fields when the server answers with errors.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const since = initial?.clientSince ?? null;
  const years = Array.from({ length: 31 }, (_, index) => currentYear - index);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 p-6"
    >
      <h2
        id={titleId}
        className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
      >
        {mode === "create" ? "Nuevo cliente" : "Editar datos"}
      </h2>

      {state.status === "failed" && (
        <p
          role="alert"
          className="rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
        >
          {state.message}
        </p>
      )}

      <TextField
        name="name"
        label="Nombre"
        defaultValue={initial?.name}
        error={errors.name}
        maxLength={120}
        autoFocus
      />
      <TextField
        name="industry"
        label="Rubro"
        defaultValue={initial?.industry}
        error={errors.industry}
        maxLength={120}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="contactName"
          label="Contacto"
          defaultValue={initial?.contactName}
          error={errors.contactName}
          maxLength={120}
        />
        <TextField
          name="contactPhone"
          label="WhatsApp"
          defaultValue={initial?.contactPhone}
          error={errors.contactPhone}
          maxLength={40}
          inputMode="tel"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-13 font-semibold text-muted">
          Redes que le manejás
        </legend>
        <div className="flex flex-wrap gap-x-6">
          {NETWORKS.map((network) => (
            <label
              key={network}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                name="networks"
                value={network}
                defaultChecked={initial?.networks.includes(network)}
                className="size-[18px] accent-ink"
              />
              {NETWORK_LABELS[network].name}
            </label>
          ))}
        </div>
        {errors.networks && <FieldError>{errors.networks}</FieldError>}
      </fieldset>

      <TextField
        name="approvalNotes"
        label="Cómo aprueba"
        defaultValue={initial?.approvalNotes}
        error={errors.approvalNotes}
        maxLength={1000}
        multiline
      />
      <TextField
        name="notes"
        label="Notas"
        defaultValue={initial?.notes}
        error={errors.notes}
        maxLength={2000}
        multiline
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-13 font-semibold text-muted">
          Cliente desde
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <select
            name="clientSinceMonth"
            aria-label="Mes"
            defaultValue={since ? since.slice(5, 7) : ""}
            aria-invalid={Boolean(errors.clientSince)}
            className={fieldClass}
          >
            <option value="">Mes</option>
            {MONTHS.map((month, index) => (
              <option key={month} value={String(index + 1).padStart(2, "0")}>
                {month}
              </option>
            ))}
          </select>
          <select
            name="clientSinceYear"
            aria-label="Año"
            defaultValue={since ? since.slice(0, 4) : ""}
            aria-invalid={Boolean(errors.clientSince)}
            className={fieldClass}
          >
            <option value="">Año</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {errors.clientSince && <FieldError>{errors.clientSince}</FieldError>}
      </fieldset>

      <div className="mt-1 flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 cursor-pointer px-1 font-semibold underline underline-offset-3"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 cursor-pointer rounded-button bg-ink px-4.5 font-semibold text-surface hover:bg-ink-hover disabled:cursor-wait disabled:bg-ink-hover"
        >
          {pending
            ? "Guardando…"
            : mode === "create"
              ? "Crear cliente"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} className="text-13 font-semibold">
      {children}
    </p>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  error,
  maxLength,
  multiline = false,
  autoFocus = false,
  inputMode,
}: {
  name: ClientField;
  label: string;
  defaultValue: string | null | undefined;
  error: string | undefined;
  maxLength: number;
  multiline?: boolean;
  autoFocus?: boolean;
  inputMode?: "tel";
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    defaultValue: defaultValue ?? "",
    maxLength,
    autoFocus,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-13 font-semibold text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} className={`${fieldClass} py-2.5`} />
      ) : (
        <input
          {...shared}
          type="text"
          inputMode={inputMode}
          className={fieldClass}
        />
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
