import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { sessions } from "../lib/sessions";
import { resolveOwnerSession } from "../lib/owner";

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session;
  if (token && sessions.has(token)) {
    res.locals.session = sessions.get(token);
    res.locals.sessionToken = token;
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7);
    if (bearerToken && sessions.has(bearerToken)) {
      res.locals.session = sessions.get(bearerToken);
      res.locals.sessionToken = bearerToken;
    }
  }
  next();
}

/**
 * Unified auth guard. Employees authenticate via the custom in-memory session
 * cookie (resolved in sessionMiddleware). Farm owners authenticate via Clerk;
 * their farm record is resolved (and JIT-provisioned) here.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (res.locals.session) {
    next();
    return;
  }

  const auth = getAuth(req);
  if (auth?.userId) {
    try {
      res.locals.session = await resolveOwnerSession(auth.userId);
      res.locals.clerkUserId = auth.userId;
      next();
      return;
    } catch (err) {
      req.log?.error({ err }, "Failed to resolve owner session");
      res.status(500).json({ error: "Failed to resolve account" });
      return;
    }
  }

  res.status(401).json({ error: "Not authenticated" });
}

/**
 * Guard for admin-only actions (owner / employer). Employees get 403.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = res.locals.session;
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (session.role === "employee") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
