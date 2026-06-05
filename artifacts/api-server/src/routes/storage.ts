import { Router, type IRouter } from "express";
import { db, storageBinsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateStorageBinBody,
  UpdateStorageBinBody,
  ListStorageBinsResponse,
  UpdateStorageBinResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatBin(b: typeof storageBinsTable.$inferSelect) {
  return {
    id: b.id,
    name: b.name,
    grainType: b.grainType ?? null,
    capacity: b.capacity ?? null,
    currentQuantity: b.currentQuantity,
    moisture: b.moisture ?? null,
    location: b.location ?? null,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/storage-bins", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const bins = await db.select().from(storageBinsTable).where(eq(storageBinsTable.farmId, session.farmId));
  res.json(ListStorageBinsResponse.parse(bins.map(formatBin)));
});

router.post("/storage-bins", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateStorageBinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [bin] = await db.insert(storageBinsTable).values({
    farmId: session.farmId,
    name: d.name,
    grainType: d.grainType || null,
    capacity: d.capacity ?? null,
    currentQuantity: d.currentQuantity ?? 0,
    moisture: d.moisture ?? null,
    location: d.location || null,
    status: d.status || "active",
  }).returning();

  res.status(201).json(formatBin(bin));
});

router.patch("/storage-bins/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateStorageBinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.grainType !== undefined) updateData.grainType = d.grainType;
  if (d.capacity !== undefined) updateData.capacity = d.capacity;
  if (d.currentQuantity !== undefined) updateData.currentQuantity = d.currentQuantity;
  if (d.moisture !== undefined) updateData.moisture = d.moisture;
  if (d.location !== undefined) updateData.location = d.location;
  if (d.status !== undefined) updateData.status = d.status;

  const [updated] = await db.update(storageBinsTable)
    .set(updateData as Partial<typeof storageBinsTable.$inferInsert>)
    .where(and(eq(storageBinsTable.id, id), eq(storageBinsTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Storage bin not found" });
    return;
  }

  res.json(UpdateStorageBinResponse.parse(formatBin(updated)));
});

router.delete("/storage-bins/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(storageBinsTable)
    .where(and(eq(storageBinsTable.id, id), eq(storageBinsTable.farmId, session.farmId)));

  res.sendStatus(204);
});

export default router;
