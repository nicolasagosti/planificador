import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";

export type SessionUser = { id: string; email: string };

/** The current session, read from the database once per request. */
export const getSession = cache(async () =>
  getAuth().api.getSession({ headers: await headers() }),
);

/**
 * The signed-in user, or a redirect to /login. Every page, Server Action,
 * route handler and query calls it: the proxy only checks that a cookie
 * exists, and layouts do not run again on client-side navigation.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return { id: session.user.id, email: session.user.email };
}
