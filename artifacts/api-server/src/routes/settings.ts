import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, farmsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sessions } from "../lib/sessions";
import { requireAuth } from "../middlewares/session";
import {
  UpdateSettingsBody,
  DeleteAccountBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ranchtrack_salt_2024").digest("hex");
}

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

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
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
  const parsed = DeleteAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, session.farmId));
  if (!farm || farm.passwordHash !== hashPassword(parsed.data.password)) {
    res.status(400).json({ error: "Incorrect password" });
    return;
  }

  await db.delete(farmsTable).where(eq(farmsTable.id, session.farmId));

  const token = res.locals.sessionToken;
  if (token) sessions.delete(token);
  res.clearCookie("session");

  res.json({ ok: true });
});

export default router;
