import { pgTable, serial, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";
import { fieldsTable } from "./fields";

export const cropsTable = pgTable("crops", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  fieldId: integer("field_id").references(() => fieldsTable.id, { onDelete: "set null" }),
  cropType: text("crop_type").notNull(),
  variety: text("variety"),
  season: text("season"),
  plantingDate: date("planting_date", { mode: "string" }),
  harvestDate: date("harvest_date", { mode: "string" }),
  acreage: real("acreage"),
  expectedYield: real("expected_yield"),
  actualYield: real("actual_yield"),
  yieldUnit: text("yield_unit").notNull().default("bushels"),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCropSchema = createInsertSchema(cropsTable).omit({ id: true, createdAt: true });
export type InsertCrop = z.infer<typeof insertCropSchema>;
export type Crop = typeof cropsTable.$inferSelect;
