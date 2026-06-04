import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, farmsTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sessions } from "../lib/sessions";
import { requireAuth } from "../middlewares/session";
import {
  RegisterFarmBody,
  LoginFarmBody,
  LoginEmployeeBody,
  ChangePasswordBody,
  GetMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ranchtrack_salt_2024").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterFarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { farmName, email, password } = parsed.data;

  const existing = await db.select().from(farmsTable).where(eq(farmsTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [farm] = await db.insert(farmsTable).values({
    name: farmName,
    email,
    passwordHash: hashPassword(password),
  }).returning();

  const token = generateToken();
  sessions.set(token, { farmId: farm.id, farmName: farm.name, email: farm.email, role: "owner" });

  res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
  res.status(201).json(GetMeResponse.parse({
    farmId: farm.id, farmName: farm.name, email: farm.email, role: "owner", employeeId: null, employeeName: null,
  }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginFarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.email, email));

  if (!farm || farm.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  sessions.set(token, { farmId: farm.id, farmName: farm.name, email: farm.email, role: "owner" });

  res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
  res.json(GetMeResponse.parse({
    farmId: farm.id, farmName: farm.name, email: farm.email, role: "owner", employeeId: null, employeeName: null,
  }));
});

router.post("/auth/employee-login", async (req, res): Promise<void> => {
  const parsed = LoginEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { farmEmail, username, password } = parsed.data;

  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.email, farmEmail));
  if (!farm) {
    res.status(401).json({ error: "Farm not found with that email" });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(
    and(
      eq(employeesTable.farmId, farm.id),
      eq(employeesTable.username, username)
    )
  );

  if (!employee || employee.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateToken();
  const role = employee.role === "employer" ? "employer" : "employee";
  sessions.set(token, {
    farmId: farm.id,
    farmName: farm.name,
    email: farm.email,
    role: role as "employer" | "employee",
    employeeId: employee.id,
    employeeName: employee.fullName,
  });

  res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
  res.json(GetMeResponse.parse({
    farmId: farm.id,
    farmName: farm.name,
    email: farm.email,
    role,
    employeeId: employee.id,
    employeeName: employee.fullName,
  }));
});

router.post("/auth/logout", (req, res): void => {
  const token = req.cookies?.session;
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie("session");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const session = res.locals.session;
  res.json(GetMeResponse.parse({
    farmId: session.farmId,
    farmName: session.farmName,
    email: session.email,
    role: session.role,
    employeeId: session.employeeId ?? null,
    employeeName: session.employeeName ?? null,
  }));
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const session = res.locals.session;
  const { currentPassword, newPassword } = parsed.data;

  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, session.farmId));
  if (!farm || farm.passwordHash !== hashPassword(currentPassword)) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  await db.update(farmsTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(farmsTable.id, session.farmId));

  res.json({ ok: true });
});

export default router;
