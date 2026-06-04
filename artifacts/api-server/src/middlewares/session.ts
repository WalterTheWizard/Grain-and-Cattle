import type { Request, Response, NextFunction } from "express";
import { sessions } from "../lib/sessions";

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session;
  if (token && sessions.has(token)) {
    res.locals.session = sessions.get(token);
    res.locals.sessionToken = token;
  }
  next();
}

export function requireAuth(_req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
