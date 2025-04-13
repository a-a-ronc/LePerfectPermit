import { users, type User, type InsertUser } from "@shared/schema";
import { projects, type Project, type InsertProject } from "@shared/schema";
import { documents, type Document, type InsertDocument } from "@shared/schema";
import { commodities, type Commodity, type InsertCommodity } from "@shared/schema";
import { projectStakeholders, type ProjectStakeholder, type InsertProjectStakeholder } from "@shared/schema";
import { activityLogs, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Define the storage interface
export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private documents: Map<number, Document>;
  private commodities: Map<number, Commodity>;
  private projectStakeholders: Map<number, ProjectStakeholder>;
  private activityLogs: Map<number, ActivityLog>;
  
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private projectIdCounter: number;
  private documentIdCounter: number;
  private commodityIdCounter: number;
  private stakeholderIdCounter: number;
  private activityLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.documents = new Map();
    this.commodities = new Map();
    this.projectStakeholders = new Map();
    this.activityLogs = new Map();
    
    this.userIdCounter = 1;
    this.projectIdCounter = 1;
    this.documentIdCounter = 1;
    this.commodityIdCounter = 1;
    this.stakeholderIdCounter = 1;
    this.activityLogIdCounter = 1;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create initial admin user
    this.createUser({
      username: "admin",
      password: "password123",
      fullName: "Admin User",
      email: "admin@intralog.com",
      role: "specialist"
    });
    
    // Create initial stakeholder
    this.createUser({
      username: "stakeholder",
      password: "password123",
      fullName: "John Smith",
      email: "john@example.com",
      role: "stakeholder"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt 
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject & { createdById: number }): Promise<Project> {
    const id = this.projectIdCounter++;
    const createdAt = new Date();
    const permitNumber = `HPS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const project: Project = {
      ...insertProject,
      id,
      createdAt,
      permitNumber
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    
    if (!project) {
      return undefined;
    }
    
    const updatedProject = {
      ...project,
      ...data
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  // Document methods
  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.projectId === projectId
    );
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const uploadedAt = new Date();
    
    // Get the latest version for this category and project
    const existingDocs = Array.from(this.documents.values()).filter(
      doc => doc.projectId === insertDocument.projectId && doc.category === insertDocument.category
    );
    
    const version = existingDocs.length > 0 
      ? Math.max(...existingDocs.map(doc => doc.version)) + 1 
      : 1;
    
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt,
      version
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    
    if (!document) {
      return undefined;
    }
    
    const updatedDocument = {
      ...document,
      ...data
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  // Commodity methods
  async getCommoditiesByProject(projectId: number): Promise<Commodity[]> {
    return Array.from(this.commodities.values()).filter(
      (commodity) => commodity.projectId === projectId
    );
  }
  
  async createCommodity(insertCommodity: InsertCommodity): Promise<Commodity> {
    const id = this.commodityIdCounter++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    
    const commodity: Commodity = {
      ...insertCommodity,
      id,
      createdAt,
      updatedAt
    };
    
    this.commodities.set(id, commodity);
    return commodity;
  }
  
  // Project stakeholder methods
  async getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]> {
    return Array.from(this.projectStakeholders.values()).filter(
      (stakeholder) => stakeholder.projectId === projectId
    );
  }
  
  async createProjectStakeholder(insertStakeholder: InsertProjectStakeholder): Promise<ProjectStakeholder> {
    const id = this.stakeholderIdCounter++;
    const addedAt = new Date();
    
    const stakeholder: ProjectStakeholder = {
      ...insertStakeholder,
      id,
      addedAt
    };
    
    this.projectStakeholders.set(id, stakeholder);
    return stakeholder;
  }
  
  // Activity log methods
  async getActivityLogsByProject(projectId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter((log) => log.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const createdAt = new Date();
    
    const log: ActivityLog = {
      ...insertLog,
      id,
      createdAt
    };
    
    this.activityLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
