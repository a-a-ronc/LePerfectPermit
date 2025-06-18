import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateCoverLetterWithAI } from "./openai";
import { generatePdfFromText } from "./pdf-generator";
import { 
  insertProjectSchema, 
  insertDocumentSchema, 
  insertCommoditiesSchema, 
  insertProjectStakeholderSchema,
  insertActivityLogSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  // Project routes
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Add error logging to help diagnose the issue
      console.log("Getting projects for user:", req.user?.id);
      
      const projects = await storage.getProjects();
      
      // Log success for debugging
      console.log(`Successfully retrieved ${projects.length} projects`);
      
      res.json(projects);
    } catch (error) {
      // Log the exact error for debugging
      console.error("Error retrieving projects:", error);
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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
      const project = await storage.updateProject(projectId, req.body);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        projectId: project.id,
        userId: req.user!.id,
        activityType: "project_updated",
        description: `Project "${project.name}" was updated`
      });
      
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Failed to update project", error });
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
      
      res.json(categoryDocuments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get category documents" });
    }
  });

  app.post("/api/projects/:projectId/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
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
      
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data", error });
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
      res.json(stakeholders);
    } catch (error) {
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
      
      // Log activity
      await storage.createActivityLog({
        projectId,
        userId: req.user!.id,
        activityType: "stakeholder_added",
        description: `${userName} was added as a stakeholder with role ${stakeholder.role}`
      });
      
      res.status(201).json(stakeholder);
    } catch (error) {
      res.status(400).json({ message: "Invalid stakeholder data", error });
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

  // Cover letter generation
  app.post("/api/projects/:projectId/generate-cover-letter", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get all approved documents for the project
      const documents = await storage.getDocumentsByProject(projectId);
      const approvedDocuments = documents.filter(doc => doc.status === 'approved');
      
      // Generate cover letter using OpenAI (with fallback to template-based generation)
      const coverLetterContent = await generateCoverLetterWithAI(project, approvedDocuments);
      
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
      // Format the content as HTML
      const htmlContent = `<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { color: #0084C6; }
    .header { margin-bottom: 40px; }
    .recipient { margin: 30px 0; }
    .subject { font-weight: bold; margin: 20px 0; }
    .category { font-weight: bold; margin-top: 15px; }
    .description { margin-top: 5px; margin-bottom: 15px; }
    .files { margin-left: 20px; margin-bottom: 20px; }
    .signature { margin-top: 40px; }
    .contact { margin-top: 30px; }
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
          fileName: `CoverLetter_${project.name.replace(/[\/\\:*?"<>|]/g, '_')}.docx`, // DOCX file
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
