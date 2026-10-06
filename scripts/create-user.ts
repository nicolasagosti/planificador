// Creates the app's only user from ADMIN_EMAIL and ADMIN_PASSWORD, or sets a
// new password if that user already exists (there is no password reset by
// email). Refuses to create a second user: the app has a single one.
import "./load-env";
import { ne } from "drizzle-orm";
import { createDb, createPool } from "@/db/connection";
import { upsertCredentialUser } from "@/db/credential-user";
import { users } from "@/db/schema";
import { adminCredentials, databaseUrl } from "@/lib/env";

const MIN_PASSWORD_LENGTH = 12;

const { email, password } = adminCredentials();
if (password.length < MIN_PASSWORD_LENGTH) {
  throw new Error(
    `ADMIN_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters.`,
  );
}

const url = databaseUrl();
const pool = createPool(url);
try {
  const result = await createDb(pool).transaction(async (tx) => {
    const others = await tx
      .select({ id: users.id })
      .from(users)
      .where(ne(users.email, email.trim().toLowerCase()));
    if (others.length > 0) {
      throw new Error(
        "The database already has a different user. The app has a single user, so a second one is not created.",
      );
    }
    return upsertCredentialUser(tx, { email, password });
  });
  const host = new URL(url).hostname;
  console.log(
    result.created
      ? `Created ${email} in ${host}.`
      : `Changed the password of ${email} in ${host} and closed its sessions.`,
  );
} finally {
  await pool.end();
}
