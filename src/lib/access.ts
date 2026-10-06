/**
 * What the login screen says when Google sends the user back with an error.
 * Better Auth adds the code to the error callback URL as `?error=`.
 */
export function googleErrorMessage(code: string): string {
  switch (code) {
    case "access_denied":
      return "No se completó el ingreso con Google.";
    default:
      return "No pudimos entrar con Google. Probá de nuevo.";
  }
}
