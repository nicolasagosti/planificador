import type { Metadata, Route } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { linkButton } from "@/components/ui/buttons";
import { listArchivedClients } from "@/db/queries/clients";
import { shortDate } from "@/domain/dates";
import { requireUser } from "@/server/session";
import { unarchiveClient } from "../actions";

export const metadata: Metadata = {
  title: "Clientes archivados · Planificador",
};

export default async function ArchivedClientsPage() {
  await requireUser();
  const clients = await listArchivedClients();

  return (
    <main className="mx-auto max-w-page px-8 pt-3 pb-18">
      <Breadcrumbs
        items={[{ label: "Clientes", href: "/" }, { label: "Archivados" }]}
      />
      <h1 className="mt-2 text-title leading-[1.1] font-bold font-stretch-112% tracking-[-0.02em]">
        Clientes archivados
      </h1>
      <p className="mt-2 text-muted">
        No aparecen en Clientes y sus piezas no cuentan. Sus calendarios siguen
        guardados.
      </p>

      {clients.length === 0 ? (
        <p className="mt-8 max-w-line border-t-[1.5px] border-ink pt-6">
          No tenés clientes archivados.
        </p>
      ) : (
        <ul className="mt-8 max-w-summary border-t-[1.5px] border-ink">
          {clients.map((client) => (
            <li
              key={client.id}
              className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-3 py-4 hover:bg-row-hover"
            >
              <div>
                {/* The name's link covers the row; the button sits above it. */}
                <Link
                  href={`/clientes/${client.id}` as Route}
                  className="text-17 font-bold font-stretch-105% text-ink no-underline after:absolute after:inset-0"
                >
                  {client.name}
                </Link>
                <div className="text-13 text-muted">
                  {[
                    client.industry,
                    client.archivedOn &&
                      `Archivado el ${shortDate(client.archivedOn)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <form
                action={unarchiveClient.bind(null, client.id)}
                className="relative z-10"
              >
                <button type="submit" className={linkButton}>
                  Desarchivar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
