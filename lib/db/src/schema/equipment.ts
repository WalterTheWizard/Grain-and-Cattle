import { pgTable, serial, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  status: text("status").notNull().default("operational"),
  hoursUsed: real("hours_used"),
  purchaseDate: date("purchase_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceLogsTable = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipmentTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  type: text("type").notNull(),
  description: text("description"),
  cost: real("cost"),
  hoursAtService: real("hours_at_service"),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({ id: true, createdAt: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogsTable).omit({ id: true });
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogsTable.$inferSelect;
