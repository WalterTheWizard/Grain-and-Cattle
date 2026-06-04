import { Router, type IRouter } from "express";
import { db, fieldsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateFieldBody,
  UpdateFieldBody,
  UpdateFieldParams,
  DeleteFieldParams,
  ListFieldsResponse,
  UpdateFieldResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatField(f: typeof fieldsTable.$inferSelect) {
  return {
    id: f.id,
    name: f.name,
    description: f.description ?? null,
    area: f.area ?? null,
    status: f.status,
    boundary: f.boundary ?? null,
    latitude: f.latitude ?? null,
    longitude: f.longitude ?? null,
    color: f.color,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/fields", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const fields = await db.select().from(fieldsTable).where(eq(fieldsTable.farmId, session.farmId));
  res.json(ListFieldsResponse.parse(fields.map(formatField)));
});

router.post("/fields", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateFieldBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, area, status, boundary, latitude, longitude, color } = parsed.data;

  const [field] = await db.insert(fieldsTable).values({
    farmId: session.farmId,
    name,
    description: description || null,
    area: area || null,
    status: status || "available",
    boundary: boundary || null,
    latitude: latitude || null,
    longitude: longitude || null,
    color: color || "#22c55e",
  }).returning();

  res.status(201).json(formatField(field));
});

router.patch("/fields/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateFieldBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.area !== undefined) updateData.area = parsed.data.area;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.boundary !== undefined) updateData.boundary = parsed.data.boundary;
  if (parsed.data.latitude !== undefined) updateData.latitude = parsed.data.latitude;
  if (parsed.data.longitude !== undefined) updateData.longitude = parsed.data.longitude;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;

  const [updated] = await db.update(fieldsTable)
    .set(updateData as Partial<typeof fieldsTable.$inferInsert>)
    .where(and(eq(fieldsTable.id, id), eq(fieldsTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Field not found" });
    return;
  }

  res.json(UpdateFieldResponse.parse(formatField(updated)));
});

router.delete("/fields/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(fieldsTable)
    .where(and(eq(fieldsTable.id, id), eq(fieldsTable.farmId, session.farmId)));

  res.sendStatus(204);
});

export default router;
