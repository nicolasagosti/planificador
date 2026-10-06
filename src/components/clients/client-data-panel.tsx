import { archiveClient, updateClient } from "@/app/(app)/clientes/actions";
import { linkButton } from "@/components/ui/buttons";
import type { ClientDetails } from "@/db/queries/clients";
import { networksPhrase } from "@/domain/catalog";
import { ClientFormDialog } from "./client-form-dialog";

/** Cliente, "Datos del cliente": contact, networks, how they approve, notes. */
export function ClientDataPanel({
  client,
  currentYear,
}: {
  client: ClientDetails;
  currentYear: number;
}) {
  const archived = client.archivedOn !== null;
  const data: [label: string, value: string | null, numeric?: boolean][] = [
    ["Contacto", client.contactName],
    ["WhatsApp", client.contactPhone, true],
    [
      "Redes que le manejás",
      client.networks.length > 0 ? networksPhrase(client.networks) : null,
    ],
    ["Cómo aprueba", client.approvalNotes],
    ["Notas", client.notes],
  ];

  return (
    <aside aria-labelledby="datos" className="min-w-0 flex-[1_1_280px]">
      <h2
        id="datos"
        className="flex min-h-11 items-center text-22 font-bold font-stretch-108% tracking-[-0.01em]"
      >
        Datos del cliente
      </h2>
      <dl className="mt-2.5 border-t-[1.5px] border-ink">
        {data.map(([label, value, numeric]) => (
          <div key={label} className="border-b border-line py-3">
            <dt className="text-13 font-semibold text-muted">{label}</dt>
            <dd className={numeric ? "mt-0.5 tabular-nums" : "mt-0.5"}>
              {value ?? <span className="text-muted">—</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
        <ClientFormDialog
          mode="edit"
          action={updateClient.bind(null, client.id)}
          currentYear={currentYear}
          initial={{
            name: client.name,
            industry: client.industry,
            contactName: client.contactName,
            contactPhone: client.contactPhone,
            networks: client.networks,
            approvalNotes: client.approvalNotes,
            notes: client.notes,
            clientSince: client.clientSince,
          }}
        />
        {!archived && (
          <form action={archiveClient.bind(null, client.id)}>
            <button type="submit" className={linkButton}>
              Archivar cliente
            </button>
          </form>
        )}
      </div>
      {!archived && (
        <p className="mt-2 text-13 text-muted">
          Archivar no borra nada: el cliente deja de aparecer en la lista y sus
          calendarios quedan guardados.
        </p>
      )}
    </aside>
  );
}
