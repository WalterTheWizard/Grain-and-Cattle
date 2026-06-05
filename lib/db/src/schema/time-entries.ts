import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { farmsTable } from "./farms";
import { employeesTable } from "./employees";

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull().references(() => farmsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TimeEntry = typeof timeEntriesTable.$inferSelect;
