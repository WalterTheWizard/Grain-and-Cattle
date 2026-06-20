import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, farmsTable, employeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sessions } from "../lib/sessions";
import { requireAuth } from "../middlewares/session";
import { LoginEmployeeBody, GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ranchtrack_salt_2024").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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

  res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "none", secure: true });
  res.json(GetMeResponse.parse({
    farmId: farm.id,
    farmName: farm.name,
    email: farm.email,
    role,
    employeeId: employee.id,
    employeeName: employee.fullName,
  }));
});

// Employee logout. Farm owners sign out via Clerk on the client.
router.post("/auth/logout", (req, res): void => {
  const token = req.cookies?.session;
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie("session");
  res.json({ ok: true });
});

router.get("/auth/demo", async (req, res): Promise<void> => {
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.email, "demo@ranchtrack.com"));
  if (!farm) {
    res.status(404).json({ error: "Demo farm not found" });
    return;
  }
  const [employee] = await db.select().from(employeesTable).where(
    and(eq(employeesTable.farmId, farm.id), eq(employeesTable.username, "jdoe"))
  );
  if (!employee) {
    res.status(404).json({ error: "Demo employee not found" });
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
  // Set both cookie (for browser) and return token (for localStorage fallback)
  res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "none", secure: true });
  res.json({ token });
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

export default router;
