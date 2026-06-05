import { Router, type IRouter } from "express";
import { db, equipmentTable, maintenanceLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateEquipmentBody,
  UpdateEquipmentBody,
  AddMaintenanceLogBody,
  ListEquipmentResponse,
  UpdateEquipmentResponse,
  ListMaintenanceLogsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatEquipment(e: typeof equipmentTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    make: e.make ?? null,
    model: e.model ?? null,
    year: e.year ?? null,
    status: e.status,
    hoursUsed: e.hoursUsed ?? null,
    purchaseDate: e.purchaseDate ?? null,
    notes: e.notes ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

function formatLog(l: typeof maintenanceLogsTable.$inferSelect) {
  return {
    id: l.id,
    equipmentId: l.equipmentId,
    date: l.date,
    type: l.type,
    description: l.description ?? null,
    cost: l.cost ?? null,
    hoursAtService: l.hoursAtService ?? null,
  };
}

router.get("/equipment", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const items = await db.select().from(equipmentTable).where(eq(equipmentTable.farmId, session.farmId));
  res.json(ListEquipmentResponse.parse(items.map(formatEquipment)));
});

router.post("/equipment", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateEquipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [item] = await db.insert(equipmentTable).values({
    farmId: session.farmId,
    name: d.name,
    type: d.type,
    make: d.make || null,
    model: d.model || null,
    year: d.year ?? null,
    status: d.status || "operational",
    hoursUsed: d.hoursUsed ?? null,
    purchaseDate: d.purchaseDate || null,
    notes: d.notes || null,
  }).returning();

  res.status(201).json(formatEquipment(item));
});

router.patch("/equipment/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateEquipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.type !== undefined) updateData.type = d.type;
  if (d.make !== undefined) updateData.make = d.make;
  if (d.model !== undefined) updateData.model = d.model;
  if (d.year !== undefined) updateData.year = d.year;
  if (d.status !== undefined) updateData.status = d.status;
  if (d.hoursUsed !== undefined) updateData.hoursUsed = d.hoursUsed;
  if (d.purchaseDate !== undefined) updateData.purchaseDate = d.purchaseDate;
  if (d.notes !== undefined) updateData.notes = d.notes;

  const [updated] = await db.update(equipmentTable)
    .set(updateData as Partial<typeof equipmentTable.$inferInsert>)
    .where(and(eq(equipmentTable.id, id), eq(equipmentTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }

  res.json(UpdateEquipmentResponse.parse(formatEquipment(updated)));
});

router.delete("/equipment/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(equipmentTable)
    .where(and(eq(equipmentTable.id, id), eq(equipmentTable.farmId, session.farmId)));

  res.sendStatus(204);
});

router.get("/equipment/:id/maintenance", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [item] = await db.select().from(equipmentTable)
    .where(and(eq(equipmentTable.id, id), eq(equipmentTable.farmId, session.farmId)));
  if (!item) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }

  const logs = await db.select().from(maintenanceLogsTable)
    .where(eq(maintenanceLogsTable.equipmentId, id));
  res.json(ListMaintenanceLogsResponse.parse(logs.map(formatLog)));
});

router.post("/equipment/:id/maintenance", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [item] = await db.select().from(equipmentTable)
    .where(and(eq(equipmentTable.id, id), eq(equipmentTable.farmId, session.farmId)));
  if (!item) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }

  const parsed = AddMaintenanceLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [log] = await db.insert(maintenanceLogsTable).values({
    equipmentId: id,
    date: d.date,
    type: d.type,
    description: d.description || null,
    cost: d.cost ?? null,
    hoursAtService: d.hoursAtService ?? null,
  }).returning();

  res.status(201).json(formatLog(log));
});

router.delete("/maintenance/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [log] = await db.select({ id: maintenanceLogsTable.id }).from(maintenanceLogsTable)
    .innerJoin(equipmentTable, eq(maintenanceLogsTable.equipmentId, equipmentTable.id))
    .where(and(eq(maintenanceLogsTable.id, id), eq(equipmentTable.farmId, session.farmId)));

  if (log) {
    await db.delete(maintenanceLogsTable).where(eq(maintenanceLogsTable.id, id));
  }

  res.sendStatus(204);
});

export default router;
