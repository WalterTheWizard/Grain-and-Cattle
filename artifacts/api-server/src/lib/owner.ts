import { clerkClient } from "@clerk/express";
import { db, farmsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SessionData } from "./sessions";

function toSession(farm: typeof farmsTable.$inferSelect): SessionData {
  return {
    farmId: farm.id,
    farmName: farm.name,
    email: farm.email,
    role: "owner",
    employeeId: null,
    employeeName: null,
  };
}

async function findByClerkUserId(clerkUserId: string) {
  const [farm] = await db
    .select()
    .from(farmsTable)
    .where(eq(farmsTable.clerkUserId, clerkUserId));
  return farm;
}

/**
 * Resolves the farm account for an authenticated Clerk owner, provisioning a
 * new farm on first sign-in (JIT). Clerk owns the identity; the farm row is the
 * local mirror that the rest of the app keys off of via farmId.
 */
export async function resolveOwnerSession(clerkUserId: string): Promise<SessionData> {
  const existing = await findByClerkUserId(clerkUserId);
  if (existing) return toSession(existing);

  const user = await clerkClient.users.getUser(clerkUserId);
  const primary = user.primaryEmailAddress ?? user.emailAddresses[0];
  const email = primary?.emailAddress ?? `${clerkUserId}@clerk.local`;
  const emailVerified = primary?.verification?.status === "verified";
  const firstName = user.firstName ?? "";
  const ownerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Rancher";
  const farmName = firstName ? `${firstName}'s Ranch` : "My Ranch";

  // If a farm already exists with this email (e.g. a legacy password account),
  // adopt it — but ONLY when it is unlinked and the Clerk email is verified.
  // This prevents an attacker from claiming an existing farm via an unverified
  // or mismatched email, and avoids silently rebinding a farm already owned by
  // a different Clerk identity.
  const [byEmail] = await db
    .select()
    .from(farmsTable)
    .where(eq(farmsTable.email, email));
  if (byEmail) {
    if (byEmail.clerkUserId === clerkUserId) {
      return toSession(byEmail);
    }
    if (byEmail.clerkUserId === null && emailVerified) {
      const [linked] = await db
        .update(farmsTable)
        .set({ clerkUserId })
        .where(eq(farmsTable.id, byEmail.id))
        .returning();
      return toSession(linked);
    }
    throw new Error(
      `Cannot link Clerk user ${clerkUserId}: a farm with email ${email} already exists and is not eligible for linking`,
    );
  }

  // Create a new farm. Guard against a concurrent first sign-in racing us to the
  // insert: on a unique-constraint collision, re-read the row the winner created.
  try {
    const [farm] = await db
      .insert(farmsTable)
      .values({ name: farmName, ownerName, email, clerkUserId })
      .returning();
    return toSession(farm);
  } catch (err) {
    const raced = await findByClerkUserId(clerkUserId);
    if (raced) return toSession(raced);
    throw err;
  }
}
