import { users, type User, type InsertUser } from "@shared/schema";
import { projects, type Project, type InsertProject } from "@shared/schema";
import { documents, type Document, type InsertDocument } from "@shared/schema";
import { commodities, type Commodity, type InsertCommodity } from "@shared/schema";
import { projectStakeholders, type ProjectStakeholder, type InsertProjectStakeholder } from "@shared/schema";
import { activityLogs, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { pool } from "./db";

// Define the storage interface
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserContactDefaults(id: number, data: { defaultContactEmail?: string; defaultContactPhone?: string }): Promise<User | undefined>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject & { createdById: number }): Promise<Project>;
  updateProject(id: number, data: Partial<Project>): Promise<Project | undefined>;
  
  // Document methods
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Commodity methods
  getCommoditiesByProject(projectId: number): Promise<Commodity[]>;
  createCommodity(commodity: InsertCommodity): Promise<Commodity>;
  
  // Project stakeholder methods
  getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]>;
  createProjectStakeholder(stakeholder: InsertProjectStakeholder): Promise<ProjectStakeholder>;
  
  // Activity log methods
  getActivityLogsByProject(projectId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, createdAt: new Date() })
      .returning();
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserContactDefaults(id: number, data: { defaultContactEmail?: string; defaultContactPhone?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        defaultContactEmail: data.defaultContactEmail,
        defaultContactPhone: data.defaultContactPhone,
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }
  
  async createProject(insertProject: InsertProject & { createdById: number }): Promise<Project> {
    const permitNumber = `HPS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const [project] = await db
      .insert(projects)
      .values({ 
        ...insertProject, 
        permitNumber,
        createdAt: new Date() 
      })
      .returning();
    
    // Create activity log for project creation
    await this.createActivityLog({
      projectId: project.id,
      userId: insertProject.createdById,
      activityType: "create_project",
      description: `Project "${insertProject.name}" created`
    });
    
    return project;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    // Get current project to compare changes for activity log
    const [currentProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    
    if (!currentProject) {
      return undefined;
    }
    
    // Update the project
    const [updatedProject] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    
    // Create activity log if status changed
    if (data.status && data.status !== currentProject.status) {
      await this.createActivityLog({
        projectId: id,
        userId: data.updatedById || currentProject.createdById,
        activityType: "status_update",
        description: `Project status changed from "${currentProject.status}" to "${data.status}"`
      });
    }
    
    return updatedProject;
  }
  
  // Document methods
  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId));
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document;
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    // Find existing documents with the same category to determine version
    const existingDocs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, insertDocument.projectId),
          eq(documents.category, insertDocument.category)
        )
      );
    
    const version = existingDocs.length > 0 
      ? Math.max(...existingDocs.map(doc => doc.version)) + 1 
      : 1;
    
    // Create the document
    const [document] = await db
      .insert(documents)
      .values({
        ...insertDocument,
        version,
        uploadedAt: new Date()
      })
      .returning();
    
    // Create activity log for document upload
    await this.createActivityLog({
      projectId: insertDocument.projectId,
      userId: insertDocument.uploadedById,
      activityType: "document_upload",
      description: `Document "${insertDocument.fileName}" uploaded`
    });
    
    return document;
  }
  
  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    // Get current document to compare changes for activity log
    const [currentDocument] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    
    if (!currentDocument) {
      return undefined;
    }
    
    // Update the document
    const [updatedDocument] = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    
    // Create activity log for status changes
    if (data.status && data.status !== currentDocument.status) {
      await this.createActivityLog({
        projectId: currentDocument.projectId,
        userId: data.reviewedById || currentDocument.uploadedById,
        activityType: "document_status_update",
        description: `Document "${currentDocument.fileName}" status changed from "${currentDocument.status}" to "${data.status}"`
      });
    }
    
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    // Get document before deleting to use in activity log
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
      
    if (!document) {
      return false;
    }
    
    // Delete the document
    const result = await db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();
      
    return result.length > 0;
  }
  
  // Commodity methods
  async getCommoditiesByProject(projectId: number): Promise<Commodity[]> {
    return await db
      .select()
      .from(commodities)
      .where(eq(commodities.projectId, projectId));
  }
  
  async createCommodity(insertCommodity: InsertCommodity): Promise<Commodity> {
    const now = new Date();
    
    const [commodity] = await db
      .insert(commodities)
      .values({
        ...insertCommodity,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Create activity log for commodity update
    await this.createActivityLog({
      projectId: insertCommodity.projectId,
      userId: insertCommodity.createdById,
      activityType: "commodity_info_update",
      description: `Commodity information added/updated for the project`
    });
    
    return commodity;
  }
  
  // Project stakeholder methods
  async getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]> {
    return await db
      .select()
      .from(projectStakeholders)
      .where(eq(projectStakeholders.projectId, projectId));
  }
  
  async createProjectStakeholder(insertStakeholder: InsertProjectStakeholder): Promise<ProjectStakeholder> {
    const [stakeholder] = await db
      .insert(projectStakeholders)
      .values({
        ...insertStakeholder,
        addedAt: new Date()
      })
      .returning();
    
    // Get user information for the activity log
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, insertStakeholder.userId));
    
    // Create activity log for stakeholder assignment
    await this.createActivityLog({
      projectId: insertStakeholder.projectId,
      userId: insertStakeholder.assignedById,
      activityType: "stakeholder_assigned",
      description: `${user?.fullName || "Stakeholder"} (${user?.email || "Unknown"}) assigned to the project`
    });
    
    return stakeholder;
  }
  
  // Activity log methods
  async getActivityLogsByProject(projectId: number): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.projectId, projectId))
      .orderBy(desc(activityLogs.createdAt));
  }
  
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        ...insertLog,
        createdAt: new Date()
      })
      .returning();
    
    return log;
  }
}

// Updated to use database storage instead of memory storage
export const storage = new DatabaseStorage();
