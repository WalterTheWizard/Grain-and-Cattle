import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { db, farmsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sessions } from "../lib/sessions";
import { requireAuth, requireAdmin } from "../middlewares/session";
import {
  UpdateSettingsBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, session.farmId));

  if (!farm) {
    res.status(404).json({ error: "Farm not found" });
    return;
  }

  res.json(GetSettingsResponse.parse({
    farmId: farm.id,
    farmName: farm.name,
    ownerName: farm.ownerName,
    email: farm.email,
    location: farm.location ?? null,
  }));
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.farmName !== undefined) updateData.name = parsed.data.farmName;
  if (parsed.data.ownerName !== undefined) updateData.ownerName = parsed.data.ownerName;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;

  const [updated] = await db.update(farmsTable)
    .set(updateData as Partial<typeof farmsTable.$inferInsert>)
    .where(eq(farmsTable.id, session.farmId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Farm not found" });
    return;
  }

  if (parsed.data.farmName) {
    const sessionToken = res.locals.sessionToken;
    if (sessionToken && sessions.has(sessionToken)) {
      const s = sessions.get(sessionToken)!;
      s.farmName = updated.name;
      sessions.set(sessionToken, s);
    }
  }

  res.json(UpdateSettingsResponse.parse({
    farmId: updated.id,
    farmName: updated.name,
    ownerName: updated.ownerName,
    email: updated.email,
    location: updated.location ?? null,
  }));
});

router.delete("/settings/account", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;

  // Only the farm owner (Clerk-authenticated) may delete the account.
  if (session.role !== "owner") {
    res.status(403).json({ error: "Only the farm owner can delete the account" });
    return;
  }

  // Remove the Clerk identity FIRST so we never orphan a farm whose owner can
  // still sign in (which would re-provision a fresh, empty farm). If Clerk
  // deletion fails, abort before touching the database.
  const clerkUserId = res.locals.clerkUserId as string | undefined;
  if (clerkUserId) {
    try {
      await clerkClient.users.deleteUser(clerkUserId);
    } catch (err) {
      req.log?.error({ err }, "Failed to delete Clerk user during account deletion");
      res.status(500).json({ error: "Failed to delete account" });
      return;
    }
  }

  await db.delete(farmsTable).where(eq(farmsTable.id, session.farmId));

  const token = res.locals.sessionToken;
  if (token) sessions.delete(token);
  res.clearCookie("session");

  res.json({ ok: true });
});

export default router;
