// The app has a single user: the account whose email is ADMIN_EMAIL.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(
  email: string | null | undefined,
  allowed: string,
): boolean {
  if (!email) return false;
  return normalizeEmail(email) === normalizeEmail(allowed);
}

/**
 * What the login screen says when Google sends the user back with an error.
 * Better Auth adds the code to the error callback URL as `?error=`.
 */
export function googleErrorMessage(code: string): string {
  switch (code) {
    case "unable_to_create_user":
    case "unable_to_create_session":
      return "Esa cuenta de Google no tiene acceso al Planificador.";
    case "access_denied":
      return "No se completó el ingreso con Google.";
    default:
      return "No pudimos entrar con Google. Probá de nuevo.";
  }
}
