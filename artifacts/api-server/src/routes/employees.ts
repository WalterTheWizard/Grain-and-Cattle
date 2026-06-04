import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import {
  CreateEmployeeBody,
  UpdateEmployeeBody,
  UpdateEmployeeParams,
  DeleteEmployeeParams,
  ListEmployeesResponse,
  UpdateEmployeeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ranchtrack_salt_2024").digest("hex");
}

function formatEmployee(e: typeof employeesTable.$inferSelect) {
  return {
    id: e.id,
    fullName: e.fullName,
    username: e.username,
    role: e.role,
    position: e.position ?? null,
    phone: e.phone ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.farmId, session.farmId));
  res.json(ListEmployeesResponse.parse(employees.map(formatEmployee)));
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fullName, username, password, role, position, phone } = parsed.data;

  const [employee] = await db.insert(employeesTable).values({
    farmId: session.farmId,
    fullName,
    username,
    passwordHash: hashPassword(password),
    role,
    position: position || null,
    phone: phone || null,
  }).returning();

  res.status(201).json(formatEmployee(employee));
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.position !== undefined) updateData.position = parsed.data.position;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

  const [updated] = await db.update(employeesTable)
    .set(updateData as Partial<typeof employeesTable.$inferInsert>)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.farmId, session.farmId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(UpdateEmployeeResponse.parse(formatEmployee(updated)));
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.farmId, session.farmId)));

  res.sendStatus(204);
});

export default router;
