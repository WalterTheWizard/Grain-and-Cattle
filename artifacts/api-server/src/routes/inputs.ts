import { Router, type IRouter } from "express";
import { db, inputsTable, inputApplicationsTable, cropsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/session";
import {
  CreateInputBody,
  UpdateInputBody,
  AddInputApplicationBody,
  ListInputsResponse,
  UpdateInputResponse,
  ListInputApplicationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatInput(i: typeof inputsTable.$inferSelect) {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    quantityOnHand: i.quantityOnHand,
    costPerUnit: i.costPerUnit ?? null,
    supplier: i.supplier ?? null,
    notes: i.notes ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

function formatApplication(a: typeof inputApplicationsTable.$inferSelect) {
  return {
    id: a.id,
    inputId: a.inputId,
    cropId: a.cropId ?? null,
    date: a.date,
    quantity: a.quantity,
    cost: a.cost ?? null,
    notes: a.notes ?? null,
  };
}

router.get("/inputs", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const items = await db.select().from(inputsTable).where(eq(inputsTable.farmId, session.farmId));
  res.json(ListInputsResponse.parse(items.map(formatInput)));
});

router.post("/inputs", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateInputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [item] = await db.insert(inputsTable).values({
    farmId: session.farmId,
    name: d.name,
    category: d.category,
    unit: d.unit || "lbs",
    quantityOnHand: d.quantityOnHand ?? 0,
    costPerUnit: d.costPerUnit ?? null,
    supplier: d.supplier || null,
    notes: d.notes || null,
  }).returning();

  res.status(201).json(formatInput(item));
});

router.patch("/inputs/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateInputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.unit !== undefined) updateData.unit = d.unit;
  if (d.quantityOnHand !== undefined) updateData.quantityOnHand = d.quantityOnHand;
  if (d.costPerUnit !== undefined) updateData.costPerUnit = d.costPerUnit;
  if (d.supplier !== undefined) updateData.supplier = d.supplier;
  if (d.notes !== undefined) updateData.notes = d.notes;

  const [updated] = await db.update(inputsTable)
    .set(updateData as Partial<typeof inputsTable.$inferInsert>)
    .where(and(eq(inputsTable.id, id), eq(inputsTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Input not found" });
    return;
  }

  res.json(UpdateInputResponse.parse(formatInput(updated)));
});

router.delete("/inputs/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(inputsTable)
    .where(and(eq(inputsTable.id, id), eq(inputsTable.farmId, session.farmId)));

  res.sendStatus(204);
});

router.get("/inputs/:id/applications", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [item] = await db.select().from(inputsTable)
    .where(and(eq(inputsTable.id, id), eq(inputsTable.farmId, session.farmId)));
  if (!item) {
    res.status(404).json({ error: "Input not found" });
    return;
  }

  const apps = await db.select().from(inputApplicationsTable)
    .where(eq(inputApplicationsTable.inputId, id));
  res.json(ListInputApplicationsResponse.parse(apps.map(formatApplication)));
});

router.post("/inputs/:id/applications", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [item] = await db.select().from(inputsTable)
    .where(and(eq(inputsTable.id, id), eq(inputsTable.farmId, session.farmId)));
  if (!item) {
    res.status(404).json({ error: "Input not found" });
    return;
  }

  const parsed = AddInputApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  if (d.cropId != null) {
    const [crop] = await db.select({ id: cropsTable.id }).from(cropsTable)
      .where(and(eq(cropsTable.id, d.cropId), eq(cropsTable.farmId, session.farmId)));
    if (!crop) {
      res.status(400).json({ error: "Crop not found" });
      return;
    }
  }
  const [app] = await db.insert(inputApplicationsTable).values({
    inputId: id,
    cropId: d.cropId ?? null,
    date: d.date,
    quantity: d.quantity,
    cost: d.cost ?? null,
    notes: d.notes || null,
  }).returning();

  res.status(201).json(formatApplication(app));
});

router.delete("/input-applications/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [app] = await db.select({ id: inputApplicationsTable.id }).from(inputApplicationsTable)
    .innerJoin(inputsTable, eq(inputApplicationsTable.inputId, inputsTable.id))
    .where(and(eq(inputApplicationsTable.id, id), eq(inputsTable.farmId, session.farmId)));

  if (app) {
    await db.delete(inputApplicationsTable).where(eq(inputApplicationsTable.id, id));
  }

  res.sendStatus(204);
});

export default router;
