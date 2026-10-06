import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps paths inside the app, with their query", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/clientes/archivados")).toBe("/clientes/archivados");
    expect(safeNextPath("/?mes=2026-11")).toBe("/?mes=2026-11");
  });

  it("falls back to home when there is nothing usable", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("clientes")).toBe("/");
  });

  it("never leaves the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/\t/evil.example")).toBe("/");
  });

  it("does not loop back to login or into the auth API", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/login?next=/")).toBe("/");
    expect(safeNextPath("/api/auth/sign-out")).toBe("/");
  });
});
