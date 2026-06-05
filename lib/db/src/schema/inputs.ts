import { pgTable, serial, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";
import { cropsTable } from "./crops";

export const inputsTable = pgTable("inputs", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull().default("lbs"),
  quantityOnHand: real("quantity_on_hand").notNull().default(0),
  costPerUnit: real("cost_per_unit"),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inputApplicationsTable = pgTable("input_applications", {
  id: serial("id").primaryKey(),
  inputId: integer("input_id").notNull().references(() => inputsTable.id, { onDelete: "cascade" }),
  cropId: integer("crop_id").references(() => cropsTable.id, { onDelete: "set null" }),
  date: date("date", { mode: "string" }).notNull(),
  quantity: real("quantity").notNull(),
  cost: real("cost"),
  notes: text("notes"),
});

export const insertInputSchema = createInsertSchema(inputsTable).omit({ id: true, createdAt: true });
export type InsertInput = z.infer<typeof insertInputSchema>;
export type Input = typeof inputsTable.$inferSelect;

export const insertInputApplicationSchema = createInsertSchema(inputApplicationsTable).omit({ id: true });
export type InsertInputApplication = z.infer<typeof insertInputApplicationSchema>;
export type InputApplication = typeof inputApplicationsTable.$inferSelect;
