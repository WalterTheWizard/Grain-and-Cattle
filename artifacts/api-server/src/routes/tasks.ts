import { Router, type IRouter } from "express";
import { db, tasksTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function formatTask(t: typeof tasksTable.$inferSelect, farmId: number) {
  let assignedToName: string | null = null;
  if (t.assignedToId) {
    const [emp] = await db.select().from(employeesTable)
      .where(and(eq(employeesTable.id, t.assignedToId), eq(employeesTable.farmId, farmId)));
    assignedToName = emp?.fullName ?? null;
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    assignedToId: t.assignedToId ?? null,
    assignedToName,
    dueDate: t.dueDate ?? null,
    timeToFinish: t.timeToFinish ?? null,
    status: t.status,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const farmId = session.farmId;

  let all = await db.select().from(tasksTable).where(eq(tasksTable.farmId, farmId));

  const status = req.query.status as string | undefined;
  if (status) {
    all = all.filter(t => t.status === status);
  }

  const formatted = await Promise.all(all.map(t => formatTask(t, farmId)));
  res.json(ListTasksResponse.parse(formatted));
});

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, assignedToId, dueDate, timeToFinish } = parsed.data;

  const [task] = await db.insert(tasksTable).values({
    farmId: session.farmId,
    title,
    description: description || null,
    assignedToId: assignedToId || null,
    dueDate: dueDate || null,
    timeToFinish: timeToFinish || null,
  }).returning();

  const formatted = await formatTask(task, session.farmId);
  res.status(201).json(formatted);
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.assignedToId !== undefined) updateData.assignedToId = parsed.data.assignedToId;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate;
  if (parsed.data.timeToFinish !== undefined) updateData.timeToFinish = parsed.data.timeToFinish;
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "completed") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }

  const [updated] = await db.update(tasksTable)
    .set(updateData as Partial<typeof tasksTable.$inferInsert>)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const formatted = await formatTask(updated, session.farmId);
  res.json(UpdateTaskResponse.parse(formatted));
});

router.delete("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.farmId, session.farmId)));

  res.sendStatus(204);
});

export default router;
