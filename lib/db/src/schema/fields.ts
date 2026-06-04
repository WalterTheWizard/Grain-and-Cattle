import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";

export const fieldsTable = pgTable("fields", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  area: real("area"),
  status: text("status").notNull().default("available"),
  boundary: text("boundary"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  color: text("color").notNull().default("#22c55e"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFieldSchema = createInsertSchema(fieldsTable).omit({ id: true, createdAt: true });
export type InsertField = z.infer<typeof insertFieldSchema>;
export type Field = typeof fieldsTable.$inferSelect;
