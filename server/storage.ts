import { users, type User, type InsertUser } from "@shared/schema";
import { projects, type Project, type InsertProject } from "@shared/schema";
import { documents, type Document, type InsertDocument } from "@shared/schema";
import { commodities, type Commodity, type InsertCommodity } from "@shared/schema";
import { projectStakeholders, type ProjectStakeholder, type InsertProjectStakeholder } from "@shared/schema";
import { stakeholderTasks, type StakeholderTask, type InsertStakeholderTask } from "@shared/schema";
import { activityLogs, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { pool } from "./db";

// Define the storage interface
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserContactDefaults(id: number, data: { defaultContactEmail?: string; defaultContactPhone?: string }): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(id: number): Promise<User | undefined>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject & { createdById: number }): Promise<Project>;
  updateProject(id: number, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
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
  updateProjectStakeholder(id: number, data: Partial<ProjectStakeholder>): Promise<ProjectStakeholder | undefined>;
  deleteProjectStakeholder(id: number): Promise<boolean>;
  
  // Stakeholder task methods
  getStakeholderTasks(stakeholderId: number): Promise<StakeholderTask[]>;
  getProjectStakeholderTasks(projectId: number): Promise<StakeholderTask[]>;
  createStakeholderTask(task: InsertStakeholderTask): Promise<StakeholderTask>;
  updateStakeholderTask(id: number, data: Partial<StakeholderTask>): Promise<StakeholderTask | undefined>;
  deleteStakeholderTask(id: number): Promise<boolean>;
  
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
      createTableIfMissing: false, // Disable auto table creation to avoid multi-statement issues
      errorLog: (error: Error) => {
        console.error('Session store error:', error);
      }
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
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

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetExpires: expires
      })
      .where(eq(users.email, email))
      .returning();
    return result;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpires} > NOW()`
        )
      );
    return user;
  }

  async clearPasswordResetToken(id: number): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetExpires: null
      })
      .where(eq(users.id, id))
      .returning();
    return result;
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

  async deleteProject(id: number): Promise<boolean> {
    try {
      console.log(`Starting deletion of project ${id}`);
      
      // Since the Neon client has issues, we'll do a workaround by temporarily disabling 
      // cascade deletion and just delete the main project-related data
      
      // Try to delete documents first
      try {
        await db.delete(documents).where(sql`project_id = ${id}`);
        console.log('Documents deleted');
      } catch (e) {
        console.log('No documents to delete or error:', e);
      }
      
      // Try to delete commodities
      try {
        await db.delete(commodities).where(sql`project_id = ${id}`);
        console.log('Commodities deleted');
      } catch (e) {
        console.log('No commodities to delete or error:', e);
      }
      
      // Try to delete activity logs
      try {
        await db.delete(activityLogs).where(sql`project_id = ${id}`);
        console.log('Activity logs deleted');
      } catch (e) {
        console.log('No activity logs to delete or error:', e);
      }
      
      // Try to delete project stakeholders (this will leave orphaned tasks for now)
      try {
        await db.delete(projectStakeholders).where(sql`project_id = ${id}`);
        console.log('Project stakeholders deleted');
      } catch (e) {
        console.log('No project stakeholders to delete or error:', e);
      }
      
      // Finally delete the project
      try {
        await db.delete(projects).where(sql`id = ${id}`);
        console.log('Project deleted successfully');
        return true;
      } catch (e) {
        console.log('Error deleting project:', e);
        return false;
      }
      
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
  
  // Document methods
  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    try {
      console.log(`Fetching documents for project ${projectId}`);
      // Exclude fileContent to avoid response size limits
      const docs = await db
        .select({
          id: documents.id,
          projectId: documents.projectId,
          category: documents.category,
          fileName: documents.fileName,
          fileType: documents.fileType,
          fileSize: documents.fileSize,
          status: documents.status,
          uploadedById: documents.uploadedById,
          uploadedAt: documents.uploadedAt,
          reviewedById: documents.reviewedById,
          reviewedAt: documents.reviewedAt,
          comments: documents.comments,
          version: documents.version,
          fileContent: sql`NULL` // Exclude large content from list view
        })
        .from(documents)
        .where(eq(documents.projectId, projectId));
      console.log(`Found ${docs.length} documents for project ${projectId}`);
      return docs as Document[];
    } catch (error) {
      console.error(`Error fetching documents for project ${projectId}:`, error);
      throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      userId: insertStakeholder.addedById,
      activityType: "stakeholder_assigned",
      description: `${user?.fullName || "Stakeholder"} (${user?.email || "Unknown"}) assigned to the project`
    });
    
    return stakeholder;
  }

  async updateProjectStakeholder(id: number, data: Partial<ProjectStakeholder>): Promise<ProjectStakeholder | undefined> {
    const [result] = await db.update(projectStakeholders)
      .set(data)
      .where(eq(projectStakeholders.id, id))
      .returning();
    return result;
  }

  async deleteProjectStakeholder(id: number): Promise<boolean> {
    const result = await db.delete(projectStakeholders).where(eq(projectStakeholders.id, id));
    return result.rowCount > 0;
  }

  async getStakeholderTasks(stakeholderId: number): Promise<StakeholderTask[]> {
    const result = await db.select().from(stakeholderTasks).where(eq(stakeholderTasks.stakeholderId, stakeholderId));
    return result;
  }

  async getProjectStakeholderTasks(projectId: number): Promise<StakeholderTask[]> {
    const result = await db.select({
      task: stakeholderTasks,
      stakeholder: projectStakeholders
    })
    .from(stakeholderTasks)
    .innerJoin(projectStakeholders, eq(stakeholderTasks.stakeholderId, projectStakeholders.id))
    .where(eq(projectStakeholders.projectId, projectId));
    
    return result.map(r => r.task);
  }

  async createStakeholderTask(insertTask: InsertStakeholderTask): Promise<StakeholderTask> {
    const [result] = await db.insert(stakeholderTasks).values(insertTask).returning();
    return result;
  }

  async updateStakeholderTask(id: number, data: Partial<StakeholderTask>): Promise<StakeholderTask | undefined> {
    const [result] = await db.update(stakeholderTasks)
      .set(data)
      .where(eq(stakeholderTasks.id, id))
      .returning();
    return result;
  }

  async deleteStakeholderTask(id: number): Promise<boolean> {
    const result = await db.delete(stakeholderTasks).where(eq(stakeholderTasks.id, id));
    return result.rowCount > 0;
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
