import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmsTable = pgTable("farms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull().default("Rancher"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  clerkUserId: text("clerk_user_id").unique(),
  location: text("location"),
  farmType: text("farm_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFarmSchema = createInsertSchema(farmsTable).omit({ id: true, createdAt: true });
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farmsTable.$inferSelect;
