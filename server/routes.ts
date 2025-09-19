import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateCoverLetterWithAI } from "./openai";
import { generatePdfFromText } from "./pdf-generator";
import { 
  insertProjectSchema, 
  insertDocumentSchema, 
  insertCommoditiesSchema, 
  insertProjectStakeholderSchema,
  insertActivityLogSchema,
  insertStakeholderTaskSchema,
  insertNotificationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  // Project routes
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user!;
      console.log("Getting projects for user:", user.id, "with role:", user.role);
      
      const allProjects = await storage.getProjects();
      let userProjects = allProjects;
      
      // Implement role-based access control
      if (user.role === 'stakeholder') {
        // Stakeholders only see projects they're associated with
        const userAccessibleProjects = [];
        
        for (const project of allProjects) {
          const stakeholders = await storage.getProjectStakeholders(project.id);
          if (stakeholders.some(stakeholder => stakeholder.userId === user.id)) {
            userAccessibleProjects.push(project);
          }
        }
        
        userProjects = userAccessibleProjects;
        console.log(`Stakeholder ${user.username} has access to ${userProjects.length} out of ${allProjects.length} projects`);
      } else {
        console.log(`Specialist ${user.username} has access to all ${allProjects.length} projects`);
      }
      
      res.json(userProjects);
    } catch (error) {
      console.error("Error retrieving projects:", error);
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    console.log("POST /api/projects called");
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    console.log("isAuthenticated:", req.isAuthenticated());
    console.log("User in session:", req.user);
    console.log("Request headers:", req.headers.cookie);
    
    if (!req.isAuthenticated()) {
      console.log("User not authenticated for project creation - returning 401");
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Please log in to create projects",
        sessionId: req.sessionID 
      });
    }
    
    try {
      console.log("Project creation request body:", req.body);
      
      let validatedData;
      try {
        validatedData = insertProjectSchema.parse(req.body);
        console.log("Validated project data:", validatedData);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return res.status(400).json({ 
          message: "Invalid project data during validation", 
          error: validationError 
        });
      }
      
      const project = await storage.createProject({
        ...validatedData,
        createdById: req.user!.id
      });
      
      // Log activity
      await storage.createActivityLog({
        projectId: project.id,
        userId: req.user!.id,
        activityType: "project_created",
        description: `Project "${project.name}" was created`
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project", error });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to get project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Get project to verify it exists and check permissions
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only allow project creators or specialists to edit projects
      const user = req.user!;
      if (user.role !== 'specialist' && existingProject.createdById !== user.id) {
        return res.status(403).json({ message: "You don't have permission to edit this project" });
      }
      
      // Validate and whitelist allowed fields
      const updateProjectSchema = z.object({
        name: z.string().min(1).optional(),
        clientName: z.string().min(1).optional(),
        facilityAddress: z.string().min(1).optional(),
        jurisdiction: z.string().min(1).optional(),
        jurisdictionAddress: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        permitNumber: z.string().optional(),
        zipCode: z.string().optional(),
        status: z.string().optional() // Only allow status updates for specialists
      }).refine((data) => {
        // Only specialists can update status
        if (data.status !== undefined && user.role !== 'specialist') {
          return false;
        }
        return true;
      }, { message: "Only specialists can update project status" });
      
      const validatedData = updateProjectSchema.parse(req.body);
      
      const project = await storage.updateProject(projectId, validatedData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        projectId: project.id,
        userId: user.id,
        activityType: "project_updated",
        description: `Project "${project.name}" was updated`
      });
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Get project details before deletion for logging
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only allow project creators or specialists to delete projects
      const user = req.user!;
      if (user.role !== 'specialist' && project.createdById !== user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this project" });
      }
      
      // Actually delete the project
      const deleted = await storage.deleteProject(projectId);
      
      if (deleted) {
        console.log(`Project ${projectId} ("${project.name}") successfully deleted by user ${user.username}`);
        
        // Log activity (best effort since project may be deleted)
        try {
          await storage.createActivityLog({
            projectId: projectId,
            userId: user.id,
            activityType: "project_deleted",
            description: `Project "${project.name}" was deleted`
          });
        } catch (e) {
          // Ignore activity log errors since project is deleted
        }
        
        res.json({ 
          message: `Project "${project.name}" has been successfully deleted.`
        });
      } else {
        res.status(500).json({ 
          message: `Failed to delete project "${project.name}". Please try again.`
        });
      }
      
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Search API endpoint
  app.get("/api/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const searchQuery = req.query.searchValue as string;
      const user = req.user!;
      
      if (!searchQuery || searchQuery.length < 3) {
        return res.json([]);
      }
      
      const searchTerm = searchQuery.toLowerCase();
      const results = [];
      
      // Search projects (with role-based filtering)
      const projects = await storage.getProjects();
      let userProjects = projects;
      
      // Filter projects based on user role
      if (user.role === 'stakeholder') {
        // Stakeholders only see projects they're associated with
        const userStakeholders = [];
        for (const project of projects) {
          const stakeholders = await storage.getProjectStakeholders(project.id);
          if (stakeholders.some(stakeholder => stakeholder.userId === user.id)) {
            userStakeholders.push(project);
          }
        }
        userProjects = userStakeholders;
      }
      
      // Filter projects by search term
      const matchingProjects = userProjects.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        project.clientName.toLowerCase().includes(searchTerm) ||
        project.facilityAddress.toLowerCase().includes(searchTerm)
      );
      
      results.push(...matchingProjects.map(project => ({
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        type: 'project'
      })));
      
      // Search documents in user's accessible projects
      for (const project of userProjects) {
        const documents = await storage.getDocumentsByProject(project.id);
        const matchingDocuments = documents.filter(doc =>
          doc.filename.toLowerCase().includes(searchTerm) ||
          doc.category.toLowerCase().includes(searchTerm)
        );
        
        results.push(...matchingDocuments.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          category: doc.category,
          projectId: doc.projectId,
          type: 'document'
        })));
      }
      
      // Search users (only specialists can see all users, stakeholders see limited results)
      if (user.role === 'specialist') {
        const users = await storage.getUsers();
        const matchingUsers = users.filter(u =>
          u.fullName.toLowerCase().includes(searchTerm) ||
          u.email.toLowerCase().includes(searchTerm) ||
          u.username.toLowerCase().includes(searchTerm)
        );
        
        results.push(...matchingUsers.map(u => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          type: 'user'
        })));
      }
      
      // Limit results and sort by relevance
      const limitedResults = results.slice(0, 20);
      
      res.json(limitedResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Document routes
  app.get("/api/projects/:projectId/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const documents = await storage.getDocumentsByProject(projectId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });
  
  // Get all documents of a specific category for a project
  app.get("/api/projects/:projectId/documents/category/:category", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const category = req.params.category;
      
      const projectDocuments = await storage.getDocumentsByProject(projectId);
      const categoryDocuments = projectDocuments.filter(doc => doc.category === category);
      
      console.log(`Found ${categoryDocuments.length} documents in category "${category}" for project ${projectId}`);
      
      res.json(categoryDocuments);
    } catch (error) {
      console.error("Error fetching category documents:", error);
      res.status(500).json({ message: "Failed to get category documents" });
    }
  });

  // Get all versions of a specific document
  app.get("/api/documents/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documentId = parseInt(req.params.id);
      const baseDocument = await storage.getDocument(documentId);
      
      if (!baseDocument) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Get all documents in the same project and category with the same filename
      const projectDocuments = await storage.getDocumentsByProject(baseDocument.projectId);
      const documentVersions = projectDocuments.filter(doc => 
        doc.category === baseDocument.category && 
        doc.fileName === baseDocument.fileName
      );
      
      console.log(`Found ${documentVersions.length} versions of document "${baseDocument.fileName}"`);
      
      res.json(documentVersions);
    } catch (error) {
      console.error("Error fetching document versions:", error);
      res.status(500).json({ message: "Failed to get document versions" });
    }
  });

  // Get individual document with content
  app.get("/api/documents/:id/content", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document content:", error);
      res.status(500).json({ message: "Failed to get document content" });
    }
  });

  app.post("/api/projects/:projectId/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check file size before processing
      if (req.body.fileSize && req.body.fileSize > 50 * 1024 * 1024) { // 50MB limit
        return res.status(413).json({ 
          message: "File size too large. Maximum allowed size is 50MB." 
        });
      }
      
      console.log(`Document upload request for project ${projectId}: ${req.body.fileName} (${Math.round(req.body.fileSize / 1024)}KB)`);
      
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        projectId,
        uploadedById: req.user!.id
      });
      
      const document = await storage.createDocument(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        projectId,
        userId: req.user!.id,
        activityType: "document_uploaded",
        description: `Document "${document.fileName}" was uploaded for category "${document.category}"`
      });
      
      console.log(`Document uploaded successfully: ${document.fileName}`);
      res.status(201).json(document);
    } catch (error) {
      console.error("Document upload error:", error);
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('aborted')) {
          res.status(408).json({ message: "Upload timeout. Please try with a smaller file." });
        } else if (error.message.includes('too large')) {
          res.status(413).json({ message: "File size too large. Maximum allowed size is 1MB." });
        } else {
          res.status(400).json({ message: "Upload failed. Please try again with a smaller file.", error: error.message });
        }
      } else {
        res.status(500).json({ message: "Server error during upload. Please try again." });
      }
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const updatedDocument = await storage.updateDocument(documentId, {
        ...req.body,
        ...(req.body.status && { 
          reviewedById: req.user!.id,
          reviewedAt: new Date()
        })
      });
      
      // Log activity if status changed
      if (req.body.status && req.body.status !== document.status) {
        await storage.createActivityLog({
          projectId: document.projectId,
          userId: req.user!.id,
          activityType: `document_${req.body.status}`,
          description: `Document "${document.fileName}" was ${req.body.status}`
        });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(400).json({ message: "Failed to update document", error });
    }
  });
  
  // Delete document route
  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documentId = parseInt(req.params.id);
      
      // Get document details before deletion for activity log
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Delete the document
      const success = await storage.deleteDocument(documentId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete document" });
      }
      
      // Log the deletion activity
      await storage.createActivityLog({
        projectId: document.projectId,
        userId: req.user!.id,
        activityType: "document_deleted",
        description: `Document "${document.fileName}" (v${document.version}) was deleted`
      });
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.delete("/api/projects/:projectId/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const documentId = parseInt(req.params.id);
      
      // Get document information before deleting
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Verify document belongs to the specified project
      if (document.projectId !== projectId) {
        return res.status(403).json({ message: "Document does not belong to this project" });
      }
      
      // Delete the document
      const success = await storage.deleteDocument(documentId);
      
      if (!success) {
        return res.status(404).json({ message: "Document not found or could not be deleted" });
      }
      
      // Log activity
      await storage.createActivityLog({
        projectId,
        userId: req.user!.id,
        activityType: "document_deleted",
        description: `Document "${document.fileName}" was deleted`
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Commodities routes
  app.get("/api/projects/:projectId/commodities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const commodities = await storage.getCommoditiesByProject(projectId);
      res.json(commodities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get commodities" });
    }
  });

  app.post("/api/projects/:projectId/commodities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertCommoditiesSchema.parse({
        ...req.body,
        projectId,
        createdById: req.user!.id
      });
      
      const commodity = await storage.createCommodity(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        projectId,
        userId: req.user!.id,
        activityType: "commodities_added",
        description: "Commodities information was added to the project"
      });
      
      res.status(201).json(commodity);
    } catch (error) {
      res.status(400).json({ message: "Invalid commodities data", error });
    }
  });

  // Project stakeholders routes
  app.get("/api/projects/:projectId/stakeholders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const stakeholders = await storage.getProjectStakeholders(projectId);
      
      // Get user details for each stakeholder
      const stakeholdersWithUsers = await Promise.all(
        stakeholders.map(async (stakeholder) => {
          const user = await storage.getUser(stakeholder.userId);
          return {
            ...stakeholder,
            user: user ? {
              fullName: user.fullName,
              email: user.email,
              username: user.username
            } : null
          };
        })
      );
      
      res.json(stakeholdersWithUsers);
    } catch (error) {
      console.error("Error getting stakeholders:", error);
      res.status(500).json({ message: "Failed to get stakeholders" });
    }
  });

  app.post("/api/projects/:projectId/stakeholders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertProjectStakeholderSchema.parse({
        ...req.body,
        projectId,
        addedById: req.user!.id
      });
      
      const stakeholder = await storage.createProjectStakeholder(validatedData);
      
      // Get user details for the log
      const user = await storage.getUser(req.body.userId);
      const userName = user ? user.fullName : "Unknown user";
      const roleList = Array.isArray(stakeholder.roles) ? stakeholder.roles.join(', ') : 'stakeholder';
      
      // Log activity
      await storage.createActivityLog({
        projectId,
        userId: req.user!.id,
        activityType: "stakeholder_added",
        description: `${userName} was added as a stakeholder with roles: ${roleList}`
      });
      
      res.status(201).json(stakeholder);
    } catch (error) {
      console.error("Error creating stakeholder:", error);
      res.status(400).json({ message: "Invalid stakeholder data", error });
    }
  });

  app.put("/api/stakeholders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const stakeholder = await storage.updateProjectStakeholder(id, req.body);
      
      if (!stakeholder) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }
      
      res.json(stakeholder);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      res.status(400).json({ message: "Invalid stakeholder update data", error });
    }
  });

  app.delete("/api/stakeholders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProjectStakeholder(id);
      
      if (!success) {
        return res.status(404).json({ message: "Stakeholder not found" });
      }
      
      res.json({ message: "Stakeholder removed successfully" });
    } catch (error) {
      console.error("Error deleting stakeholder:", error);
      res.status(500).json({ message: "Failed to remove stakeholder" });
    }
  });

  // Stakeholder tasks routes
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getProjectStakeholderTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error getting stakeholder tasks:", error);
      res.status(500).json({ message: "Failed to get stakeholder tasks" });
    }
  });

  app.post("/api/stakeholders/:stakeholderId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const stakeholderId = parseInt(req.params.stakeholderId);
      const user = req.user as any;
      
      console.log('Creating stakeholder task:', { stakeholderId, body: req.body });
      
      const validatedData = insertStakeholderTaskSchema.parse({
        ...req.body,
        stakeholderId,
        createdById: user.id
      });
      
      const task = await storage.createStakeholderTask(validatedData);
      
      // Get stakeholder details for notification
      const stakeholder = await storage.getProjectStakeholder(stakeholderId);
      if (stakeholder) {
        const stakeholderUser = await storage.getUser(stakeholder.userId);
        
        if (stakeholderUser) {
          console.log('Creating notification for user:', stakeholderUser.id);
          
          // Create in-app notification
          await storage.createNotification({
            userId: stakeholderUser.id,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned a new task: ${task.description}`,
            isRead: false,
            metadata: {
              projectId: stakeholder.projectId,
              taskId: task.id,
              taskType: task.taskType,
              assignedBy: user.fullName,
            }
          });

          // Send email notification (handle errors gracefully)
          try {
            const { sendEmail } = await import('./email');
            console.log('Attempting to send email notification...');
            
            const project = await storage.getProject(stakeholder.projectId);
            const emailResult = await sendEmail({
              to: stakeholderUser.email,
              from: user.defaultContactEmail || 'noreply@painlesspermit.com',
              subject: `${project?.name || 'Project'}: Task Assigned`,
              text: `${stakeholderUser.fullName},

You have been assigned a new task:

${task.description}

Task Type: ${task.taskType}
Assigned by: ${user.fullName}
Project: ${project?.name || 'Unknown Project'}

Please log into PainlessPermit to view more details.`,
            });
            
            console.log('Email notification result:', emailResult);
          } catch (emailError: any) {
            console.warn('Email notification failed (expected without SENDGRID_API_KEY):', emailError?.message || 'Unknown error');
          }

          // Create activity log
          await storage.createActivityLog({
            projectId: stakeholder.projectId,
            userId: user.id,
            activityType: 'task_assigned',
            description: `Task assigned to ${stakeholderUser.fullName}: ${task.description}`,
          });
        }
      }
      
      console.log('Task assignment completed successfully');
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating stakeholder task:", error);
      res.status(500).json({ message: "Failed to create task", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateStakeholderTask(id, req.body);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Invalid task update data", error });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStakeholderTask(id);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Activity logs routes
  app.get("/api/projects/:projectId/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const activities = await storage.getActivityLogsByProject(projectId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activity logs" });
    }
  });

  // Generate cover letter download endpoint
  app.get("/api/projects/:id/cover-letter", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      const documents = await storage.getDocumentsByProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const coverLetter = await generateCoverLetterWithAI(project, documents);
      
      // Generate Word document using docx
      const { generateCoverLetterDocx } = await import("./docxGenerator");
      const docxBuffer = await generateCoverLetterDocx(coverLetter);
      
      // Set headers for Word document download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Cover_Letter_${project.name.replace(/\s+/g, '_')}.docx"`);
      
      res.send(docxBuffer);
    } catch (error) {
      console.error("Error generating cover letter:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  // Cover letter generation
  app.post("/api/projects/:projectId/generate-cover-letter", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const { 
        contactEmail, 
        contactPhone, 
        projectName, 
        customerName, 
        facilityAddress, 
        jurisdiction, 
        jurisdictionAddress 
      } = req.body;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Override project details with the submitted values
      const projectWithUpdatedInfo = {
        ...project,
        name: projectName || project.name,
        clientName: customerName || project.clientName,
        facilityAddress: facilityAddress || project.facilityAddress,
        jurisdiction: jurisdiction || project.jurisdiction,
        jurisdictionAddress: jurisdictionAddress || project.jurisdictionAddress,
        contactEmail: contactEmail || project.contactEmail,
        contactPhone: contactPhone || project.contactPhone,
      };
      
      // Get all documents for the project (both approved and uploaded)
      const documents = await storage.getDocumentsByProject(projectId);
      const submittedDocuments = documents.filter(doc => doc.status === 'approved' || doc.status === 'pending_review');
      
      // Generate cover letter using OpenAI (with fallback to template-based generation)
      const coverLetterContent = await generateCoverLetterWithAI(projectWithUpdatedInfo, submittedDocuments);
      
      console.log("Cover letter text content (first 100 chars):", coverLetterContent.substring(0, 100));
      
      // Sanitize content if it still contains placeholders
      const sanitizedContent = coverLetterContent.replace(/\[(.*?)\]/g, (match) => {
        const placeholder = match.toLowerCase();
        
        if (placeholder.includes('name') || placeholder.includes('contact')) {
          return 'Intralog Permit Services Team';
        } else if (placeholder.includes('address')) {
          return '123 Permit Way, Suite 100';
        } else if (placeholder.includes('city') || placeholder.includes('state') || placeholder.includes('zip')) {
          return 'Phoenix, AZ 85001';
        } else if (placeholder.includes('email')) {
          return 'permits@intralog.com';
        } else if (placeholder.includes('phone')) {
          return '(800) 555-1234';
        } else if (placeholder.includes('date')) {
          return new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          });
        } else {
          // For any other placeholders, use a generic replacement
          return 'Intralog Permit Services';
        }
      });
      
      // Use HTML directly instead of generating a PDF to avoid file size calculation issues
      // Format the content as HTML with improved alignment for all document categories
      const htmlContent = `<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; text-align: left; }
    h1 { color: #0084C6; }
    .header { margin-bottom: 40px; }
    .recipient { margin: 30px 0; }
    .subject { font-weight: bold; margin: 20px 0; }
    .category { font-weight: bold; margin-top: 15px; text-align: left; }
    .description { margin-top: 5px; margin-bottom: 15px; text-align: left; }
    .files { margin-left: 0px; margin-bottom: 20px; text-align: left; }
    .signature { margin-top: 40px; }
    .contact { margin-top: 30px; }
    .document-list { text-align: left; }
    .document-item { margin-bottom: 15px; text-align: left; }
    p { text-align: left; }
    div { text-align: left; }
  </style>
</head>
<body>
  ${sanitizedContent}
</body>
</html>`;

      // Generate Word document using docx
      const { generateCoverLetterDocx } = await import("./docxGenerator");
      const docxBuffer = await generateCoverLetterDocx(sanitizedContent);
      
      // Use a fixed integer file size to avoid database issues
      const fileSize = docxBuffer.length;
      
      // Create the cover letter document as DOCX
      try {
        const coverLetter = await storage.createDocument({
          projectId,
          category: 'cover_letter',
          fileName: `CoverLetter_${projectWithUpdatedInfo.name.replace(/[\/\\:*?"<>|]/g, '_')}.docx`, // DOCX file
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: fileSize, // Actual buffer size
          fileContent: docxBuffer.toString('base64'), // Convert DOCX buffer to base64
          status: 'pending_review',
          uploadedById: req.user!.id,
          comments: 'AI-powered cover letter for PainlessPermit™️'
        });
        
        // Log success information
        console.log("Cover letter document created successfully with ID:", coverLetter.id);
        
        // Log activity
        await storage.createActivityLog({
          projectId,
          userId: req.user!.id,
          activityType: "cover_letter_generated",
          description: "AI-powered cover letter was generated for this project"
        });
        
        // Force immediate refresh of documents list for this project
        const updatedDocuments = await storage.getDocumentsByProject(projectId);
        
        // Return both the cover letter and a flag indicating it was successful
        // Include a refresh flag to tell the client to reload the page
        res.status(201).json({
          ...coverLetter,
          success: true,
          message: "Cover letter generated and added to project documents",
          refresh: true // Signal to client to refresh after success
        });
      } catch (error: any) { // Type assertion for error
        console.error("Error creating cover letter document:", error);
        throw new Error(`Failed to save cover letter: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to generate cover letter", error });
    }
  });

  // Task assignment endpoint
  app.post("/api/tasks/assign", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { userId, taskType, description, documentCategory, projectId, projectName } = req.body;
      const user = req.user as any;

      console.log('Task assignment request:', { userId, taskType, description, projectId, projectName });

      // Validate required fields
      if (!userId || !taskType || !description || !projectId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Find the project stakeholder ID for this user
      const stakeholders = await storage.getProjectStakeholders(projectId);
      const targetStakeholder = stakeholders.find(s => s.userId === parseInt(userId));
      
      if (!targetStakeholder) {
        return res.status(400).json({ error: "User is not a stakeholder on this project" });
      }

      // Create the task using the correct stakeholder ID
      const task = await storage.createStakeholderTask({
        stakeholderId: targetStakeholder.id,
        documentCategory: documentCategory || taskType,
        taskType,
        description,
        status: 'pending',
        createdById: user.id,
      });

      console.log('Task created:', task);

      // Get stakeholder user details for notification  
      const stakeholderUser = await storage.getUser(targetStakeholder.userId);
        
      if (stakeholderUser) {
        console.log('Creating notification for user:', stakeholderUser.id);
        
        // Create in-app notification
        await storage.createNotification({
          userId: stakeholderUser.id,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `You have been assigned a new task: ${description}`,
          isRead: false,
          metadata: {
            projectId,
            taskId: task.id,
            taskType,
            assignedBy: user.fullName,
          }
        });

        // Send email notification (handle errors gracefully)
        try {
          const { sendEmail } = await import('./email');
          console.log('Attempting to send email notification...');
          
          const emailResult = await sendEmail({
            to: stakeholderUser.email,
            from: user.defaultContactEmail || 'noreply@painlesspermit.com',
            subject: `${projectName}: Task Assigned`,
            text: `${stakeholderUser.fullName},

${description}

Assigned by: ${user.fullName}
Project: ${projectName}
Task Type: ${taskType}

Please log into PainlessPermit to view more details.`,
          });
          
          console.log('Email notification result:', emailResult);
        } catch (emailError: any) {
          console.warn('Email notification failed (expected without SENDGRID_API_KEY):', emailError?.message || 'Unknown error');
        }
      }

      // Create activity log
      await storage.createActivityLog({
        projectId,
        userId: user.id,
        activityType: 'task_assigned',
        description: `Task assigned to stakeholder: ${description}`,
      });

      console.log('Task assignment completed successfully');
      res.json(task);
    } catch (error: any) {
      console.error('Error assigning task:', error);
      res.status(500).json({ error: "Failed to assign task", details: error?.message || 'Unknown error' });
    }
  });

  // Notifications endpoint
  app.get("/api/notifications/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const user = req.user as any;

      if (user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // User profile update endpoint
  app.patch("/api/user/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Users can only update their own profile
      if (user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { fullName, email, defaultContactEmail, defaultContactPhone } = req.body;
      
      // Update user profile
      const updatedUser = await storage.updateUserContactDefaults(userId, {
        defaultContactEmail: defaultContactEmail || null,
        defaultContactPhone: defaultContactPhone || null,
      });

      // Also update main email and full name (would need to add this method to storage)
      // For now, return success
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // User password change endpoint
  app.patch("/api/user/:id/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Users can only change their own password
      if (user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      // Verify current password
      const { comparePasswords } = await import('./auth');
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const { hashPassword } = await import('./auth');
      const hashedNewPassword = await hashPassword(newPassword);
      
      const updatedUser = await storage.updateUserPassword(userId, hashedNewPassword);
      res.json({ success: true });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simple cover letter generator (placeholder for AI-based generation)
function generateCoverLetter(project: any, documents: any[]): string {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const documentList = documents.map(doc => 
    `- ${formatDocumentCategory(doc.category)}: ${doc.fileName}`
  ).join('\n');
  
  return `
Cover Letter - High-Piled Storage Permit Application
${date}

To: ${project.jurisdiction}
Re: High-Piled Storage Permit for ${project.name}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress}

To Whom It May Concern:

Please find attached the complete set of documents for the High-Piled Storage Permit application for ${project.name}. 

The following documents are included in this submission:

${documentList}

If you require any additional information or clarification, please contact us at your earliest convenience.

Sincerely,
Intralog Permit Services Team
  `.trim();
}

function formatDocumentCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
