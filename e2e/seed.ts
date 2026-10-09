import { execSync } from "node:child_process";

// Local runs start and end with the mockup data (docs/SPEC.md, section 10):
// the tests create clients, and the development database must go back to
// the state the screens are compared against. Never against a deployed app.
export default function reloadSeed() {
  if (process.env.E2E_BASE_URL) return;
  // Through the shell, so it also finds npm on Windows (npm.cmd).
  execSync("npm run --silent db:seed", { stdio: "inherit" });
}
