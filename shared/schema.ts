import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("stakeholder"), // stakeholder or specialist
  defaultContactEmail: text("default_contact_email"),
  defaultContactPhone: text("default_contact_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

// Project Schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facilityAddress: text("facility_address").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  jurisdictionAddress: text("jurisdiction_address"), // Building department address for correspondence
  clientName: text("client_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  permitNumber: text("permit_number"),
  zipCode: text("zip_code"),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, ready_for_submission, under_review, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  deadline: timestamp("deadline"),
  createdById: integer("created_by_id").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  permitNumber: true,
}).extend({
  // Ensure deadline is treated as a string during form submission
  deadline: z.string().optional().transform(val => 
    val ? new Date(val) : undefined
  ),
  // Make createdById optional for client-side validation (will be added by server)
  createdById: z.number().optional(),
});

// Document Schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(), // site_plan, facility_plan, egress_plan, structural_plans, commodities, fire_protection, special_inspection, cover_letter
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileContent: text("file_content").notNull(), // base64 encoded for in-memory storage
  status: text("status").notNull().default("not_submitted"), // not_submitted, pending_review, approved, rejected
  uploadedById: integer("uploaded_by_id").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  comments: text("comments"),
  version: integer("version").notNull().default(1),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  reviewedAt: true,
  reviewedById: true,
  version: true
});

// Commodities Schema (for the specialized form)
export const commodities = pgTable("commodities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  commodityTypes: json("commodity_types").notNull(), // Array of commodity types
  storageMethod: text("storage_method").notNull(), // pallets, cardboard_boxes, plastic, etc.
  classification: text("classification").notNull(), // Based on Table 3203.8 in IFC Chapter 32
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertCommoditiesSchema = createInsertSchema(commodities).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Project Stakeholders
export const projectStakeholders = pgTable("project_stakeholders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  roles: text("roles").array().notNull().default([]), // Multiple roles support
  assignedCategories: text("assigned_categories").array().notNull().default([]), // Document categories assigned
  addedById: integer("added_by_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// New table for stakeholder notifications and task descriptions
export const stakeholderTasks = pgTable("stakeholder_tasks", {
  id: serial("id").primaryKey(),
  stakeholderId: integer("stakeholder_id").notNull().references(() => projectStakeholders.id, { onDelete: "cascade" }),
  documentCategory: text("document_category").notNull(),
  taskType: text("task_type").notNull(), // 'provide_document', 'review_document', 'approve_document'
  description: text("description").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed'
  dueDate: timestamp("due_date"),
  notificationSent: boolean("notification_sent").default(false),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertProjectStakeholderSchema = createInsertSchema(projectStakeholders).omit({
  id: true,
  addedAt: true
});

export const insertStakeholderTaskSchema = createInsertSchema(stakeholderTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(), // document_uploaded, document_approved, document_rejected, project_created, stakeholder_added, etc.
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Commodity = typeof commodities.$inferSelect;
export type InsertCommodity = z.infer<typeof insertCommoditiesSchema>;

export type ProjectStakeholder = typeof projectStakeholders.$inferSelect;
export type InsertProjectStakeholder = z.infer<typeof insertProjectStakeholderSchema>;

export type StakeholderTask = typeof stakeholderTasks.$inferSelect;
export type InsertStakeholderTask = z.infer<typeof insertStakeholderTaskSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Document category enum for front-end use
export const DocumentCategory = {
  SITE_PLAN: 'site_plan',
  FACILITY_PLAN: 'facility_plan',
  EGRESS_PLAN: 'egress_plan',
  STRUCTURAL_PLANS: 'structural_plans',
  COMMODITIES: 'commodities',
  FIRE_PROTECTION: 'fire_protection',
  SPECIAL_INSPECTION: 'special_inspection',
  COVER_LETTER: 'cover_letter',
} as const;

export type DocumentCategoryType = typeof DocumentCategory[keyof typeof DocumentCategory];

// Project status enum for front-end use
export const ProjectStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ProjectStatusType = typeof ProjectStatus[keyof typeof ProjectStatus];

// Document status enum for front-end use
export const DocumentStatus = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type DocumentStatusType = typeof DocumentStatus[keyof typeof DocumentStatus];

// User roles enum for front-end use
export const UserRole = {
  SPECIALIST: 'specialist',
  STAKEHOLDER: 'stakeholder',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Stakeholder roles enum
export const StakeholderRole = {
  PROJECT_MANAGER: 'project_manager',
  FACILITY_MANAGER: 'facility_manager',
  ENGINEER: 'engineer',
  ARCHITECT: 'architect',
  FIRE_SAFETY_CONSULTANT: 'fire_safety_consultant',
  BUILDING_OWNER: 'building_owner',
  CONTRACTOR: 'contractor',
  REVIEWER: 'reviewer',
  APPROVER: 'approver',
} as const;

export type StakeholderRoleType = typeof StakeholderRole[keyof typeof StakeholderRole];

// Task types enum
export const TaskType = {
  PROVIDE_DOCUMENT: 'provide_document',
  REVIEW_DOCUMENT: 'review_document',
  APPROVE_DOCUMENT: 'approve_document',
  COLLABORATE: 'collaborate',
} as const;

export type TaskTypeType = typeof TaskType[keyof typeof TaskType];
