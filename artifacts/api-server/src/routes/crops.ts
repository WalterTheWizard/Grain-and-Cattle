import { Router, type IRouter } from "express";
import { db, cropsTable, fieldsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateCropBody,
  UpdateCropBody,
  ListCropsResponse,
  UpdateCropResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatCrop(c: typeof cropsTable.$inferSelect) {
  return {
    id: c.id,
    fieldId: c.fieldId ?? null,
    cropType: c.cropType,
    variety: c.variety ?? null,
    season: c.season ?? null,
    plantingDate: c.plantingDate ?? null,
    harvestDate: c.harvestDate ?? null,
    acreage: c.acreage ?? null,
    expectedYield: c.expectedYield ?? null,
    actualYield: c.actualYield ?? null,
    yieldUnit: c.yieldUnit,
    status: c.status,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/crops", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const crops = await db.select().from(cropsTable).where(eq(cropsTable.farmId, session.farmId));
  res.json(ListCropsResponse.parse(crops.map(formatCrop)));
});

async function fieldBelongsToFarm(fieldId: number, farmId: number): Promise<boolean> {
  const [field] = await db.select({ id: fieldsTable.id })
    .from(fieldsTable)
    .where(and(eq(fieldsTable.id, fieldId), eq(fieldsTable.farmId, farmId)));
  return Boolean(field);
}

router.post("/crops", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateCropBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  if (d.fieldId != null && !(await fieldBelongsToFarm(d.fieldId, session.farmId))) {
    res.status(400).json({ error: "Field not found" });
    return;
  }
  const [crop] = await db.insert(cropsTable).values({
    farmId: session.farmId,
    fieldId: d.fieldId ?? null,
    cropType: d.cropType,
    variety: d.variety || null,
    season: d.season || null,
    plantingDate: d.plantingDate || null,
    harvestDate: d.harvestDate || null,
    acreage: d.acreage ?? null,
    expectedYield: d.expectedYield ?? null,
    actualYield: d.actualYield ?? null,
    yieldUnit: d.yieldUnit || "bushels",
    status: d.status || "planned",
    notes: d.notes || null,
  }).returning();

  res.status(201).json(formatCrop(crop));
});

router.patch("/crops/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateCropBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  if (d.fieldId != null && !(await fieldBelongsToFarm(d.fieldId, session.farmId))) {
    res.status(400).json({ error: "Field not found" });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (d.fieldId !== undefined) updateData.fieldId = d.fieldId;
  if (d.cropType !== undefined) updateData.cropType = d.cropType;
  if (d.variety !== undefined) updateData.variety = d.variety;
  if (d.season !== undefined) updateData.season = d.season;
  if (d.plantingDate !== undefined) updateData.plantingDate = d.plantingDate;
  if (d.harvestDate !== undefined) updateData.harvestDate = d.harvestDate;
  if (d.acreage !== undefined) updateData.acreage = d.acreage;
  if (d.expectedYield !== undefined) updateData.expectedYield = d.expectedYield;
  if (d.actualYield !== undefined) updateData.actualYield = d.actualYield;
  if (d.yieldUnit !== undefined) updateData.yieldUnit = d.yieldUnit;
  if (d.status !== undefined) updateData.status = d.status;
  if (d.notes !== undefined) updateData.notes = d.notes;

  const [updated] = await db.update(cropsTable)
    .set(updateData as Partial<typeof cropsTable.$inferInsert>)
    .where(and(eq(cropsTable.id, id), eq(cropsTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Crop not found" });
    return;
  }

  res.json(UpdateCropResponse.parse(formatCrop(updated)));
});

router.delete("/crops/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(cropsTable)
    .where(and(eq(cropsTable.id, id), eq(cropsTable.farmId, session.farmId)));

  res.sendStatus(204);
});

export default router;
