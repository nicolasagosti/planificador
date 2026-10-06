import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

describe("contentSecurityPolicy", () => {
  const production = contentSecurityPolicy("abc123", { development: false });
  const development = contentSecurityPolicy("abc123", { development: true });

  it("allows scripts and styles only with the request's nonce", () => {
    expect(production).toContain(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic'",
    );
    expect(production).toContain("style-src 'self' 'nonce-abc123'");
    expect(production).not.toContain("unsafe-inline");
  });

  it("allows eval only in development", () => {
    expect(production).not.toContain("unsafe-eval");
    expect(development).toContain("'unsafe-eval'");
  });

  it("forbids framing and plugins", () => {
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("object-src 'none'");
  });

  it("upgrades insecure requests only in production", () => {
    expect(production).toContain("upgrade-insecure-requests");
    expect(development).not.toContain("upgrade-insecure-requests");
  });
});
