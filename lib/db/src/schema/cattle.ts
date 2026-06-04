import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";

export const cattleTable = pgTable("cattle", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  tagNumber: text("tag_number").notNull(),
  name: text("name"),
  gender: text("gender").notNull(),
  breed: text("breed"),
  birthDate: date("birth_date", { mode: "string" }),
  motherId: integer("mother_id"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weightRecordsTable = pgTable("weight_records", {
  id: serial("id").primaryKey(),
  cattleId: integer("cattle_id").notNull().references(() => cattleTable.id, { onDelete: "cascade" }),
  weight: text("weight").notNull(),
  unit: text("unit").notNull().default("lbs"),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
});

export const healthRecordsTable = pgTable("health_records", {
  id: serial("id").primaryKey(),
  cattleId: integer("cattle_id").notNull().references(() => cattleTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description"),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
});

export const insertCattleSchema = createInsertSchema(cattleTable).omit({ id: true, createdAt: true });
export type InsertCattle = z.infer<typeof insertCattleSchema>;
export type Cattle = typeof cattleTable.$inferSelect;

export const insertWeightSchema = createInsertSchema(weightRecordsTable).omit({ id: true });
export type InsertWeight = z.infer<typeof insertWeightSchema>;
export type WeightRecord = typeof weightRecordsTable.$inferSelect;

export const insertHealthSchema = createInsertSchema(healthRecordsTable).omit({ id: true });
export type InsertHealth = z.infer<typeof insertHealthSchema>;
export type HealthRecord = typeof healthRecordsTable.$inferSelect;
