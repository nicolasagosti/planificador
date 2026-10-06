import { requireUser } from "@/server/session";

// Placeholder until the Clientes screen is built.
export default async function ClientsPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-page px-8 pt-6 pb-18">
      <h1 className="text-22 font-bold font-stretch-108% tracking-[-0.01em]">
        Clientes
      </h1>
    </main>
  );
}
