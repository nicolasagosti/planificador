import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { getClient } from "@/db/queries/clients";
import { networksPhrase } from "@/domain/catalog";
import { clientSubtitle } from "@/domain/phrases";
import { idSchema } from "@/domain/schemas";
import { requireUser } from "@/server/session";
import { today } from "@/server/today";
import { updateClient } from "../actions";

async function loadClient(clientId: string) {
  const id = idSchema.safeParse(clientId);
  if (!id.success) notFound();
  const client = await getClient(id.data);
  if (!client) notFound();
  return client;
}

export async function generateMetadata({
  params,
}: PageProps<"/clientes/[clientId]">): Promise<Metadata> {
  const client = await loadClient((await params).clientId);
  return { title: `${client.name} · Planificador` };
}

// The client's calendars, the month's sentence and archiving come with the
// Cliente screen; for now: the name and the client's data, which can be edited.
export default async function ClientPage({
  params,
}: PageProps<"/clientes/[clientId]">) {
  await requireUser();
  const client = await loadClient((await params).clientId);
  const subtitle = clientSubtitle(client);

  const data: [label: string, value: string | null, numeric?: boolean][] = [
    ["Contacto", client.contactName],
    ["WhatsApp", client.contactPhone, true],
    [
      "Redes que le manejás",
      client.networks.length ? networksPhrase(client.networks) : null,
    ],
    ["Cómo aprueba", client.approvalNotes],
    ["Notas", client.notes],
  ];

  return (
    <main className="mx-auto max-w-page px-8 pt-3 pb-18">
      <Breadcrumbs
        items={[{ label: "Clientes", href: "/" }, { label: client.name }]}
      />
      <h1 className="mt-2 text-title leading-[1.1] font-bold font-stretch-112% tracking-[-0.02em]">
        {client.name}
      </h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}

      <aside aria-labelledby="datos" className="mt-11 max-w-[380px]">
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
            currentYear={Number(today().slice(0, 4))}
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
        </div>
      </aside>
    </main>
  );
}
