import { storage } from './storage.js';
import { sendEmail } from './email.js';
import type { InsertNotification } from '../shared/schema.js';

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  userEmail?: string;
  userFullName?: string;
}

export class NotificationService {
  static async createNotification(data: NotificationData) {
    try {
      // Create in-app notification
      const notification: InsertNotification = {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        isRead: false
      };

      const createdNotification = await storage.createNotification(notification);

      // Send email notification if user email is provided
      if (data.userEmail && data.userFullName) {
        await this.sendEmailNotification(data);
      }

      return createdNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async sendEmailNotification(data: NotificationData) {
    try {
      const emailSubject = `PainlessPermit™ - ${data.title}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">PainlessPermit™ Notification</h2>
          </div>
          
          <div style="padding: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">${data.title}</h3>
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">${data.message}</p>
            
            ${data.metadata?.projectId ? `
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #1976d2;"><strong>Project:</strong> ${data.metadata.projectName || `Project #${data.metadata.projectId}`}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px;">
              <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/dashboard" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in PainlessPermit™
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated notification from PainlessPermit™. 
              <br>To manage your notification preferences, log into your account.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: data.userEmail!,
        subject: emailSubject,
        html: emailBody,
        text: `${data.title}\n\n${data.message}\n\nLog into PainlessPermit™ to view details: ${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/dashboard`
      });

      console.log(`Email notification sent to ${data.userEmail} for: ${data.title}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw error - in-app notification should still work even if email fails
    }
  }

  // Document Upload Notifications
  static async notifyDocumentUploaded(projectId: number, uploaderName: string, documentCategory: string, fileName: string) {
    try {
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) return;

      // Get all specialists (they should be notified when documents are uploaded)
      const allUsers = await storage.getUsers();
      const specialists = allUsers.filter((user: any) => user.role === 'specialist');

      // Get project stakeholders who should also be notified
      const stakeholders = await storage.getProjectStakeholders(projectId);
      
      const notificationPromises = [];

      // Notify specialists
      for (const specialist of specialists) {
        notificationPromises.push(
          this.createNotification({
            userId: specialist.id,
            type: 'document_uploaded',
            title: 'New Document Uploaded',
            message: `${uploaderName} uploaded ${fileName} (${documentCategory}) for project "${project.name}". Please review the document.`,
            metadata: { 
              projectId, 
              projectName: project.name,
              documentCategory,
              fileName,
              uploadedBy: uploaderName
            },
            userEmail: specialist.email,
            userFullName: specialist.fullName
          })
        );
      }

      // Notify relevant stakeholders (exclude the uploader) - get user details for each stakeholder
      for (const stakeholder of stakeholders) {
        const stakeholderUser = await storage.getUser(stakeholder.userId);
        if (stakeholderUser && stakeholderUser.fullName !== uploaderName) {
          notificationPromises.push(
            this.createNotification({
              userId: stakeholder.userId,
              type: 'document_uploaded',
              title: 'Document Added to Project',
              message: `A new document has been added to project "${project.name}": ${fileName} (${documentCategory})`,
              metadata: { 
                projectId, 
                projectName: project.name,
                documentCategory,
                fileName
              },
              userEmail: stakeholderUser.email,
              userFullName: stakeholderUser.fullName
            })
          );
        }
      }

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating document upload notifications:', error);
    }
  }

  // Project Status Change Notifications
  static async notifyProjectStatusChange(projectId: number, oldStatus: string, newStatus: string, changedBy: string) {
    try {
      const project = await storage.getProject(projectId);
      if (!project) return;

      // Get all stakeholders for this project
      const stakeholders = await storage.getProjectStakeholders(projectId);
      
      const getStatusMessage = (status: string) => {
        switch (status) {
          case 'not_started': return 'Project has been created and is ready to begin';
          case 'in_progress': return 'Project is now in progress and documents are being gathered';
          case 'ready_for_submission': return 'Project is ready for permit submission';
          case 'under_review': return 'Permit has been submitted and is under review by authorities';
          case 'approved': return 'Permit has been approved! 🎉';
          case 'rejected': return 'Permit application has been rejected and requires revisions';
          default: return `Project status updated to: ${status}`;
        }
      };

      const statusMessage = getStatusMessage(newStatus);
      const notificationPromises = [];

      for (const stakeholder of stakeholders) {
        const stakeholderUser = await storage.getUser(stakeholder.userId);
        if (stakeholderUser) {
          // Determine notification type based on status
          let notificationType = 'project_updated';
          if (newStatus === 'approved') notificationType = 'project_approved';
          if (newStatus === 'rejected') notificationType = 'project_rejected';
          if (newStatus === 'under_review') notificationType = 'project_submitted';

          notificationPromises.push(
            this.createNotification({
              userId: stakeholder.userId,
              type: notificationType,
              title: 'Project Status Update',
              message: `Project "${project.name}" status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}. ${statusMessage}`,
              metadata: { 
                projectId, 
                projectName: project.name,
                oldStatus,
                newStatus,
                changedBy
              },
              userEmail: stakeholderUser.email,
              userFullName: stakeholderUser.fullName
            })
          );
        }
      }

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating project status change notifications:', error);
    }
  }

  // Task Assignment Notifications
  static async notifyTaskAssigned(taskId: number, assigneeUserId: number, assignedBy: string, projectId: number, taskDescription: string) {
    try {
      const project = await storage.getProject(projectId);
      const assignee = await storage.getUser(assigneeUserId);
      
      if (!project || !assignee) return;

      await this.createNotification({
        userId: assigneeUserId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task by ${assignedBy} for project "${project.name}": ${taskDescription}`,
        metadata: { 
          projectId, 
          projectName: project.name,
          taskId,
          taskDescription,
          assignedBy
        },
        userEmail: assignee.email,
        userFullName: assignee.fullName
      });
    } catch (error) {
      console.error('Error creating task assignment notification:', error);
    }
  }

  // Deadline Approaching Notifications
  static async notifyDeadlineApproaching(projectId: number, deadlineDate: Date, daysUntilDeadline: number) {
    try {
      const project = await storage.getProject(projectId);
      if (!project) return;

      // Get all stakeholders for this project
      const stakeholders = await storage.getProjectStakeholders(projectId);
      const allUsers = await storage.getUsers();
      const specialists = allUsers.filter((user: any) => user.role === 'specialist');
      
      const urgencyLevel = daysUntilDeadline <= 3 ? 'urgent' : daysUntilDeadline <= 7 ? 'soon' : 'approaching';
      const message = `Deadline for project "${project.name}" is ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} away (${deadlineDate.toLocaleDateString()})`;
      
      const notificationPromises = [];

      // Notify stakeholders
      for (const stakeholder of stakeholders) {
        const stakeholderUser = await storage.getUser(stakeholder.userId);
        if (stakeholderUser) {
          notificationPromises.push(
            this.createNotification({
              userId: stakeholder.userId,
              type: 'deadline_approaching',
              title: `Deadline ${urgencyLevel === 'urgent' ? 'URGENT' : 'Approaching'}`,
              message,
              metadata: { 
                projectId, 
                projectName: project.name,
                deadlineDate: deadlineDate.toISOString(),
                daysUntilDeadline,
                urgencyLevel
              },
              userEmail: stakeholderUser.email,
              userFullName: stakeholderUser.fullName
            })
          );
        }
      }

      // Notify specialists
      for (const specialist of specialists) {
        notificationPromises.push(
          this.createNotification({
            userId: specialist.id,
            type: 'deadline_approaching',
            title: `Project Deadline ${urgencyLevel === 'urgent' ? 'URGENT' : 'Approaching'}`,
            message,
            metadata: { 
              projectId, 
              projectName: project.name,
              deadlineDate: deadlineDate.toISOString(),
              daysUntilDeadline,
              urgencyLevel
            },
            userEmail: specialist.email,
            userFullName: specialist.fullName
          })
        );
      }

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating deadline notifications:', error);
    }
  }

  // Task Completion Notifications
  static async notifyTaskCompleted(taskId: number, completedBy: string, projectId: number, taskDescription: string) {
    try {
      const project = await storage.getProject(projectId);
      if (!project) return;

      // Get all specialists to notify them of task completion
      const allUsers = await storage.getUsers();
      const specialists = allUsers.filter((user: any) => user.role === 'specialist' && user.fullName !== completedBy);
      
      const notificationPromises = [];

      for (const specialist of specialists) {
        notificationPromises.push(
          this.createNotification({
            userId: specialist.id,
            type: 'task_completed',
            title: 'Task Completed',
            message: `${completedBy} completed a task for project "${project.name}": ${taskDescription}`,
            metadata: { 
              projectId, 
              projectName: project.name,
              taskId,
              taskDescription,
              completedBy
            },
            userEmail: specialist.email,
            userFullName: specialist.fullName
          })
        );
      }

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating task completion notifications:', error);
    }
  }
}