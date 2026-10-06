import { afterEach, describe, expect, it, vi } from "vitest";
import { authUrl, fakeToday, isProduction, migrationDatabaseUrl } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authUrl", () => {
  it("uses BETTER_AUTH_URL when it is set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "planificador.vercel.app");
    expect(authUrl()).toBe("http://localhost:3000");
  });

  it("falls back to the Vercel production domain", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "planificador.vercel.app");
    expect(authUrl()).toBe("https://planificador.vercel.app");
  });

  it("fails loudly when neither is set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(() => authUrl()).toThrow("BETTER_AUTH_URL");
  });
});

describe("isProduction", () => {
  it("is only the Vercel production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isProduction()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isProduction()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(false);
  });
});

describe("fakeToday", () => {
  it("treats an empty value as unset and rejects impossible days", () => {
    vi.stubEnv("APP_FAKE_TODAY", "");
    expect(fakeToday()).toBeUndefined();
    vi.stubEnv("APP_FAKE_TODAY", "2026-10-05");
    expect(fakeToday()).toBe("2026-10-05");
    vi.stubEnv("APP_FAKE_TODAY", "2026-02-30");
    expect(() => fakeToday()).toThrow("APP_FAKE_TODAY");
  });
});

describe("migrationDatabaseUrl", () => {
  it("prefers the direct connection and falls back to DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://pooled.example/db");
    vi.stubEnv("DATABASE_URL_UNPOOLED", "postgresql://direct.example/db");
    expect(migrationDatabaseUrl()).toBe("postgresql://direct.example/db");
    vi.stubEnv("DATABASE_URL_UNPOOLED", "");
    expect(migrationDatabaseUrl()).toBe("postgresql://pooled.example/db");
  });
});
