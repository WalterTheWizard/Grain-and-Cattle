import { Router, type IRouter } from "express";
import { db, messagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { CreateMessageBody, ListMessagesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function formatMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    senderName: m.senderName,
    senderRole: m.senderRole,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;

  const all = await db.select().from(messagesTable)
    .where(eq(messagesTable.farmId, session.farmId))
    .orderBy(asc(messagesTable.createdAt));

  const formatted = all.map(formatMessage);
  res.json(ListMessagesResponse.parse(formatted));
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const session = res.locals.session;
  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const senderName = session.role === "owner" ? "Owner" : (session.employeeName ?? "Employee");

  const [message] = await db.insert(messagesTable).values({
    farmId: session.farmId,
    senderName,
    senderRole: session.role,
    content: parsed.data.content,
  }).returning();

  res.status(201).json(formatMessage(message));
});

export default router;
