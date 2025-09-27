import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin"), // 'admin', 'super_admin'
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  description: text("description").notNull(),
  description_sv: text("description_sv"),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  services: text("services").array().default(sql`'{}'::text[]`), // Specific services offered
  serviceområden: text("serviceområden").array().default(sql`'{}'::text[]`), // Service areas
  specialties: text("specialties"), // Free text for detailed specialties
  location: text("location").notNull(),
  region: text("region").notNull(),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const claimRequestStatusEnum = pgEnum('claim_request_status', ['pending', 'approved', 'rejected']);

export const claimRequests = pgTable("claim_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: claimRequestStatusEnum("status").default('pending'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
});

export const companyUsers = pgTable("company_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").default("editor"), // 'editor', 'admin', 'owner'
  accessToken: text("access_token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  approvedBy: varchar("approved_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
});

export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  serviceType: text("service_type"), // Type of service needed
  message: text("message").notNull(),
  urgency: text("urgency"), // "akut", "inom_veckan", "planerad"
  preferredContact: text("preferred_contact").default("email"), // "email", "phone", "both"
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  claimRequests: many(claimRequests),
  quoteRequests: many(quoteRequests),
  companyUsers: many(companyUsers),
}));

export const claimRequestsRelations = relations(claimRequests, ({ one }) => ({
  company: one(companies, {
    fields: [claimRequests.companyId],
    references: [companies.id],
  }),
  reviewer: one(users, {
    fields: [claimRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
  approver: one(users, {
    fields: [companyUsers.approvedBy],
    references: [users.id],
  }),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({ one }) => ({
  company: one(companies, {
    fields: [quoteRequests.companyId],
    references: [companies.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertClaimRequestSchema = createInsertSchema(claimRequests).omit({
  id: true,
  submittedAt: true,
  status: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
});

export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  accessToken: true,
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  submittedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertClaimRequest = z.infer<typeof insertClaimRequestSchema>;
export type ClaimRequest = typeof claimRequests.$inferSelect;

export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;

export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
