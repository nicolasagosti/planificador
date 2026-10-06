"use client";

import { useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PlusIcon } from "@/components/icons";
import {
  linkButton,
  primaryButton,
  primaryIconButton,
} from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { fieldClass, labelClass } from "@/components/ui/fields";

/**
 * "Nuevo calendario": proposes the next month without a calendar and lets
 * another one be chosen. Creating it opens the new calendar.
 */
export function NewCalendarDialog({
  action,
  months,
  proposed,
}: {
  action: (formData: FormData) => Promise<void>;
  months: { value: string; label: string }[];
  proposed: string;
}) {
  const selectId = useId();
  return (
    <Dialog
      title="Nuevo calendario"
      triggerClassName={primaryIconButton}
      trigger={
        <>
          <PlusIcon />
          <span>Nuevo calendario</span>
        </>
      }
    >
      {(close) => (
        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={selectId} className={labelClass}>
              Mes
            </label>
            <select
              id={selectId}
              name="month"
              defaultValue={proposed}
              className={fieldClass}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={close}
              className={`${linkButton} px-1`}
            >
              Cancelar
            </button>
            <SubmitButton>Crear calendario</SubmitButton>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? "Creando…" : children}
    </button>
  );
}
