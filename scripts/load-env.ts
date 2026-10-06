// Loads .env files the way Next.js does. @next/env is a CommonJS bundle whose
// named exports Node's ESM loader cannot detect, so it is required instead.
import { createRequire } from "node:module";

const requireCommonJs = createRequire(import.meta.url);
const { loadEnvConfig } = requireCommonJs(
  "@next/env",
) as typeof import("@next/env");

loadEnvConfig(process.cwd());
