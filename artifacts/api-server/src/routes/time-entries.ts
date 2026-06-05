import { Router, type IRouter } from "express";
import { db, timeEntriesTable, employeesTable } from "@workspace/db";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";

const router: IRouter = Router();

function durationMinutes(clockIn: Date, clockOut: Date | null): number | null {
  if (!clockOut) return null;
  return Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
}

async function formatEntry(
  e: typeof timeEntriesTable.$inferSelect,
  farmId: number,
) {
  const [emp] = await db
    .select({ fullName: employeesTable.fullName })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, e.employeeId), eq(employeesTable.farmId, farmId)));

  return {
    id: e.id,
    employeeId: e.employeeId,
    employeeName: emp?.fullName ?? null,
    clockIn: e.clockIn.toISOString(),
    clockOut: e.clockOut ? e.clockOut.toISOString() : null,
    durationMinutes: durationMinutes(e.clockIn, e.clockOut),
    notes: e.notes ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/time-entries", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const farmId = session.farmId;

  let query = db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.farmId, farmId));

  let all = await query;

  // Employees only see their own entries
  if (session.role !== "owner" && session.employeeId) {
    all = all.filter(e => e.employeeId === session.employeeId);
  }

  const { employeeId, startDate, endDate } = req.query as Record<string, string | undefined>;
  if (employeeId) {
    all = all.filter(e => e.employeeId === parseInt(employeeId, 10));
  }
  if (startDate) {
    const start = new Date(startDate);
    all = all.filter(e => e.clockIn >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    all = all.filter(e => e.clockIn <= end);
  }

  // Sort newest first
  all.sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime());

  const formatted = await Promise.all(all.map(e => formatEntry(e, farmId)));
  res.json(formatted);
});

router.get("/time-entries/current", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;

  if (!session.employeeId) {
    res.json({ clockedIn: false });
    return;
  }

  const [open] = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.farmId, session.farmId),
        eq(timeEntriesTable.employeeId, session.employeeId),
        isNull(timeEntriesTable.clockOut),
      ),
    );

  if (!open) {
    res.json({ clockedIn: false });
    return;
  }

  const entry = await formatEntry(open, session.farmId);
  res.json({ clockedIn: true, entry });
});

router.post("/time-entries/clock-in", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;

  if (!session.employeeId) {
    res.status(403).json({ error: "Only employees can clock in" });
    return;
  }

  // Check for open entry
  const [open] = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.farmId, session.farmId),
        eq(timeEntriesTable.employeeId, session.employeeId),
        isNull(timeEntriesTable.clockOut),
      ),
    );

  if (open) {
    res.status(400).json({ error: "Already clocked in" });
    return;
  }

  const notes = typeof req.body?.notes === "string" ? req.body.notes : null;

  const [entry] = await db
    .insert(timeEntriesTable)
    .values({
      farmId: session.farmId,
      employeeId: session.employeeId,
      clockIn: new Date(),
      notes,
    })
    .returning();

  const formatted = await formatEntry(entry, session.farmId);
  res.status(201).json(formatted);
});

router.post("/time-entries/clock-out", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;

  if (!session.employeeId) {
    res.status(403).json({ error: "Only employees can clock out" });
    return;
  }

  const [open] = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.farmId, session.farmId),
        eq(timeEntriesTable.employeeId, session.employeeId),
        isNull(timeEntriesTable.clockOut),
      ),
    );

  if (!open) {
    res.status(400).json({ error: "Not clocked in" });
    return;
  }

  const notes = typeof req.body?.notes === "string" ? req.body.notes : (open.notes ?? null);

  const [updated] = await db
    .update(timeEntriesTable)
    .set({ clockOut: new Date(), notes })
    .where(eq(timeEntriesTable.id, open.id))
    .returning();

  const formatted = await formatEntry(updated, session.farmId);
  res.json(formatted);
});

export default router;
