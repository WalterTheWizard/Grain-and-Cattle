import { Router, type IRouter } from "express";
import { db, cattleTable, weightRecordsTable, healthRecordsTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  ListCattleQueryParams,
  CreateCattleBody,
  GetCattleParams,
  UpdateCattleBody,
  UpdateCattleParams,
  DeleteCattleParams,
  UpdateCattleStatusParams,
  UpdateCattleStatusBody,
  ListWeightsParams,
  AddWeightBody,
  AddWeightParams,
  ListHealthRecordsParams,
  AddHealthRecordBody,
  AddHealthRecordParams,
  ListCattleResponse,
  GetCattleResponse,
  UpdateCattleResponse,
  UpdateCattleStatusResponse,
  ListWeightsResponse,
  ListHealthRecordsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

interface FormattedCattle {
  id: number;
  tagNumber: string;
  name: string | null;
  gender: string;
  breed: string | null;
  birthDate: string | null;
  motherId: number | null;
  motherTag: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  calves?: FormattedCattle[];
  latestWeight?: null;
}

function formatCattle(c: typeof cattleTable.$inferSelect, motherTag?: string | null, calves?: typeof cattleTable.$inferSelect[]): FormattedCattle {
  return {
    id: c.id,
    tagNumber: c.tagNumber,
    name: c.name ?? null,
    gender: c.gender,
    breed: c.breed ?? null,
    birthDate: c.birthDate ?? null,
    motherId: c.motherId ?? null,
    motherTag: motherTag ?? null,
    status: c.status,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    ...(calves !== undefined ? {
      calves: calves.map(cal => formatCattle(cal)),
      latestWeight: null,
    } : {}),
  };
}

router.get("/cattle", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const queryParams = ListCattleQueryParams.safeParse(req.query);

  let query = db.select().from(cattleTable).where(eq(cattleTable.farmId, session.farmId));

  const all = await db.select().from(cattleTable).where(eq(cattleTable.farmId, session.farmId));

  let results = all;

  const status = req.query.status as string | undefined;
  if (status) {
    results = results.filter(c => c.status === status);
  } else {
    results = results.filter(c => c.status === "active");
  }

  const search = req.query.search as string | undefined;
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(c =>
      c.tagNumber.toLowerCase().includes(s) ||
      (c.name && c.name.toLowerCase().includes(s))
    );
  }

  const gender = req.query.gender as string | undefined;
  if (gender) {
    results = results.filter(c => c.gender === gender);
  }

  const tagMap = new Map(all.map(c => [c.id, c.tagNumber]));

  const formatted = results.map(c => formatCattle(c, c.motherId ? tagMap.get(c.motherId) : null));
  res.json(ListCattleResponse.parse(formatted));
});

router.post("/cattle", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateCattleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tagNumber, name, gender, breed, birthDate, motherId, notes } = parsed.data;

  const [cattle] = await db.insert(cattleTable).values({
    farmId: session.farmId,
    tagNumber,
    name: name || null,
    gender,
    breed: breed || null,
    birthDate: birthDate || null,
    motherId: motherId || null,
    notes: notes || null,
  }).returning();

  res.status(201).json(formatCattle(cattle));
});

router.get("/cattle/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [cattle] = await db.select().from(cattleTable)
    .where(and(eq(cattleTable.id, id), eq(cattleTable.farmId, session.farmId)));

  if (!cattle) {
    res.status(404).json({ error: "Cattle not found" });
    return;
  }

  const all = await db.select().from(cattleTable).where(eq(cattleTable.farmId, session.farmId));
  const tagMap = new Map(all.map(c => [c.id, c.tagNumber]));
  const calves = all.filter(c => c.motherId === id);

  const detail = {
    ...formatCattle(cattle, cattle.motherId ? tagMap.get(cattle.motherId) : null, calves),
  };

  res.json(GetCattleResponse.parse(detail));
});

router.patch("/cattle/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateCattleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.tagNumber !== undefined) updateData.tagNumber = parsed.data.tagNumber;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.gender !== undefined) updateData.gender = parsed.data.gender;
  if (parsed.data.breed !== undefined) updateData.breed = parsed.data.breed;
  if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate;
  if (parsed.data.motherId !== undefined) updateData.motherId = parsed.data.motherId;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [updated] = await db.update(cattleTable)
    .set(updateData as Partial<typeof cattleTable.$inferInsert>)
    .where(and(eq(cattleTable.id, id), eq(cattleTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Cattle not found" });
    return;
  }

  res.json(UpdateCattleResponse.parse(formatCattle(updated)));
});

router.delete("/cattle/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(cattleTable)
    .where(and(eq(cattleTable.id, id), eq(cattleTable.farmId, session.farmId)));

  res.sendStatus(204);
});

router.patch("/cattle/:id/status", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateCattleStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(cattleTable)
    .set({ status: parsed.data.status })
    .where(and(eq(cattleTable.id, id), eq(cattleTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Cattle not found" });
    return;
  }

  res.json(UpdateCattleStatusResponse.parse(formatCattle(updated)));
});

router.get("/cattle/:id/weights", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const weights = await db.select().from(weightRecordsTable)
    .where(eq(weightRecordsTable.cattleId, id));

  res.json(ListWeightsResponse.parse(weights.map(w => ({
    id: w.id,
    cattleId: w.cattleId,
    weight: parseFloat(w.weight),
    unit: w.unit,
    date: w.date,
    notes: w.notes ?? null,
  }))));
});

router.post("/cattle/:id/weights", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = AddWeightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db.insert(weightRecordsTable).values({
    cattleId: id,
    weight: String(parsed.data.weight),
    unit: parsed.data.unit || "lbs",
    date: parsed.data.date,
    notes: parsed.data.notes || null,
  }).returning();

  res.status(201).json({
    id: record.id,
    cattleId: record.cattleId,
    weight: parseFloat(record.weight),
    unit: record.unit,
    date: record.date,
    notes: record.notes ?? null,
  });
});

router.get("/cattle/:id/health", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const records = await db.select().from(healthRecordsTable)
    .where(eq(healthRecordsTable.cattleId, id));

  res.json(ListHealthRecordsResponse.parse(records.map(r => ({
    id: r.id,
    cattleId: r.cattleId,
    type: r.type,
    description: r.description ?? null,
    date: r.date,
    notes: r.notes ?? null,
  }))));
});

router.post("/cattle/:id/health", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = AddHealthRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db.insert(healthRecordsTable).values({
    cattleId: id,
    type: parsed.data.type,
    description: parsed.data.description || null,
    date: parsed.data.date,
    notes: parsed.data.notes || null,
  }).returning();

  res.status(201).json({
    id: record.id,
    cattleId: record.cattleId,
    type: record.type,
    description: record.description ?? null,
    date: record.date,
    notes: record.notes ?? null,
  });
});

export default router;
