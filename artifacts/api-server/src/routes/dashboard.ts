import { Router, type IRouter } from "express";
import { db, cattleTable, tasksTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const farmId = session.farmId;

  const activeCattle = await db.select().from(cattleTable)
    .where(and(eq(cattleTable.farmId, farmId), eq(cattleTable.status, "active")));

  const totalHerd = activeCattle.length;
  const activeHead = activeCattle.length;

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    .toISOString().split("T")[0];

  const calves = activeCattle.filter(c =>
    c.birthDate && c.birthDate >= oneYearAgo
  ).length;

  const pendingTasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.farmId, farmId), eq(tasksTable.status, "pending")));

  const activeTasks = pendingTasks.length;

  const recentRegistrations = activeCattle
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      tagNumber: c.tagNumber,
      name: c.name ?? null,
      gender: c.gender as "female" | "male" | "bull" | "steer",
      breed: c.breed ?? null,
      birthDate: c.birthDate ?? null,
      motherId: c.motherId ?? null,
      motherTag: null,
      status: c.status as "active" | "sold" | "deceased",
      notes: c.notes ?? null,
      createdAt: c.createdAt.toISOString(),
    }));

  res.json(GetDashboardResponse.parse({
    totalHerd,
    activeHead,
    calves,
    activeTasks,
    recentRegistrations,
    herdChange: 2,
    tasksTrend: activeTasks > 0 ? "Action needed" : "All clear",
  }));
});

export default router;
