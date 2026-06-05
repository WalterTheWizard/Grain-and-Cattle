import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { farmsTable } from "./farms";

export const storageBinsTable = pgTable("storage_bins", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  grainType: text("grain_type"),
  capacity: real("capacity"),
  currentQuantity: real("current_quantity").notNull().default(0),
  moisture: real("moisture"),
  location: text("location"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStorageBinSchema = createInsertSchema(storageBinsTable).omit({ id: true, createdAt: true });
export type InsertStorageBin = z.infer<typeof insertStorageBinSchema>;
export type StorageBin = typeof storageBinsTable.$inferSelect;
