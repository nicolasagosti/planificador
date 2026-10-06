const BASE = "http://planificador.invalid";

/**
 * Where to go after signing in. Only paths inside this app are accepted, so a
 * crafted link cannot send the user to another site once they log in.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";
  if (url.pathname === "/login" || url.pathname.startsWith("/api/")) {
    return "/";
  }
  return `${url.pathname}${url.search}`;
}
