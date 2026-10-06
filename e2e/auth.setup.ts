import { test as setup } from "@playwright/test";
import { againstDeployedApp, signIn, STORAGE_STATE } from "./helpers";

// Signs in once per run and saves the session for the screen tests: signing
// in before every test would run into the login attempt limit.
setup("sesión del usuario de desarrollo", async ({ page }) => {
  setup.skip(againstDeployedApp, "production signs in with Google only");
  await signIn(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
