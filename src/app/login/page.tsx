import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/safe-next";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Entrar · Planificador" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getSession()) redirect(target as Route);

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-page items-center px-8 py-2">
          <Brand />
        </div>
      </header>
      <main className="mx-auto max-w-page px-8 pt-16 pb-18">
        <h1 className="text-title leading-[1.1] font-bold font-stretch-112% tracking-[-0.02em] text-balance">
          Entrá con tu cuenta
        </h1>
        <div className="max-w-100">
          <LoginForm next={target} />
        </div>
      </main>
    </>
  );
}
