import { describe, expect, it } from "vitest";
import { googleErrorMessage, isAllowedEmail } from "./access";

describe("isAllowedEmail", () => {
  it("accepts only the configured account, ignoring case and spaces", () => {
    expect(isAllowedEmail("Ana@Example.com ", "ana@example.com")).toBe(true);
    expect(isAllowedEmail("otra@example.com", "ana@example.com")).toBe(false);
  });

  it("rejects a missing email", () => {
    expect(isAllowedEmail(undefined, "ana@example.com")).toBe(false);
    expect(isAllowedEmail(null, "ana@example.com")).toBe(false);
    expect(isAllowedEmail("", "ana@example.com")).toBe(false);
  });
});

describe("googleErrorMessage", () => {
  it("tells an account without access apart from other failures", () => {
    expect(googleErrorMessage("unable_to_create_user")).toBe(
      "Esa cuenta de Google no tiene acceso al Planificador.",
    );
    expect(googleErrorMessage("unable_to_create_session")).toBe(
      "Esa cuenta de Google no tiene acceso al Planificador.",
    );
    expect(googleErrorMessage("access_denied")).toBe(
      "No se completó el ingreso con Google.",
    );
    expect(googleErrorMessage("invalid_code")).toBe(
      "No pudimos entrar con Google. Probá de nuevo.",
    );
  });
});
