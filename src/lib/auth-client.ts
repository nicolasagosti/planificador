import { createAuthClient } from "better-auth/react";

// Browser client for Better Auth. The login form uses it so that sign-in goes
// through /api/auth, where the attempt limit applies.
export const authClient = createAuthClient();
