import { describe, expect, it } from "vitest";
import { googleErrorMessage } from "./access";

describe("googleErrorMessage", () => {
  it("tells a cancelled sign-in apart from other failures", () => {
    expect(googleErrorMessage("access_denied")).toBe(
      "No se completó el ingreso con Google.",
    );
    expect(googleErrorMessage("invalid_code")).toBe(
      "No pudimos entrar con Google. Probá de nuevo.",
    );
    expect(googleErrorMessage("unable_to_create_user")).toBe(
      "No pudimos entrar con Google. Probá de nuevo.",
    );
  });
});
