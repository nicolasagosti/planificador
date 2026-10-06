import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Tx } from "./connection";
import { accounts, sessions, users } from "./schema";

// Better Auth's provider id for email-and-password accounts.
const CREDENTIAL_PROVIDER = "credential";

/**
 * Creates the email-and-password user, or sets a new password if the user
 * exists. Public sign-up is disabled, so this stores what Better Auth's
 * sign-up would: a user and a "credential" account holding the password hash.
 * A new password signs out every open session.
 */
export async function upsertCredentialUser(
  tx: Tx,
  input: { email: string; password: string },
): Promise<{ userId: string; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  const [existing] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (!existing) {
    const [user] = await tx
      .insert(users)
      .values({
        name: email.split("@")[0] ?? email,
        email,
        emailVerified: true,
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Could not create the user");
    await tx.insert(accounts).values({
      userId: user.id,
      providerId: CREDENTIAL_PROVIDER,
      accountId: user.id,
      password: passwordHash,
    });
    return { userId: user.id, created: true };
  }

  const updated = await tx
    .update(accounts)
    .set({ password: passwordHash })
    .where(
      and(
        eq(accounts.userId, existing.id),
        eq(accounts.providerId, CREDENTIAL_PROVIDER),
      ),
    )
    .returning({ id: accounts.id });
  if (updated.length === 0) {
    await tx.insert(accounts).values({
      userId: existing.id,
      providerId: CREDENTIAL_PROVIDER,
      accountId: existing.id,
      password: passwordHash,
    });
  }
  await tx.delete(sessions).where(eq(sessions.userId, existing.id));
  return { userId: existing.id, created: false };
}
