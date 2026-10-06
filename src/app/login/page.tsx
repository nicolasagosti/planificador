import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { GoogleSignIn } from "@/components/google-sign-in";
import { PasswordLoginForm } from "@/components/password-login-form";
import { googleErrorMessage } from "@/lib/access";
import { googleCredentials, isProduction } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Entrar · Planificador" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const target = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getSession()) redirect(target as Route);

  const googleError =
    typeof error === "string" ? googleErrorMessage(error) : null;
  // Production always has Google; email and password exist only outside
  // production (see src/server/auth.ts).
  const withGoogle = googleCredentials() !== undefined;
  const withPassword = !isProduction();

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
        <div className="mt-8 flex max-w-100 flex-col gap-5">
          {googleError && (
            <p
              role="alert"
              className="rounded-button border-[1.5px] border-ink bg-surface px-3 py-2.5 font-semibold"
            >
              {googleError}
            </p>
          )}
          {withGoogle && <GoogleSignIn next={target} />}
          {withPassword && (
            <section
              aria-labelledby="password-login"
              className="mt-6 border-t border-line pt-6"
            >
              <h2
                id="password-login"
                className="text-13 font-semibold text-muted"
              >
                Con contraseña, solo en desarrollo
              </h2>
              <PasswordLoginForm next={target} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
