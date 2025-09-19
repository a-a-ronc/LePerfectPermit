import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Edit, Send, HelpCircle, MessageCircle } from "lucide-react";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";
import { Project, ProjectStatus } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditProjectDialog } from "./edit-project-dialog";
import { MessageDialog } from "@/components/messaging/message-dialog";

/**
 * Project Status Progression:
 * 
 * 1. Not Started: Initial state when a project is created
 * 2. In Progress: When documents are being uploaded but not all required ones are approved
 * 3. Ready for Submission: When documentProgress reaches 100% (all required docs approved)
 * 4. Submitted: When the project has been submitted to the municipality
 * 5. Under Review: When the municipality is reviewing the permit application
 * 6. Approved: When the permit is approved by the municipality
 * 7. Rejected: When the permit is rejected by the municipality
 * 
 * The Submit button is enabled when documentProgress is 100% and status is not already
 * 'ready_for_submission' or 'approved'.
 */

interface ProjectDetailsHeaderProps {
  project: Project;
  documentProgress: number;
  onSubmit: () => void;
}

export function ProjectDetailsHeader({ project, documentProgress, onSubmit }: ProjectDetailsHeaderProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { bg, text } = getProjectStatusColor(project.status);
  const isSubmittable = documentProgress === 100 && 
                         project.status !== ProjectStatus.READY_FOR_SUBMISSION && 
                         project.status !== ProjectStatus.APPROVED;
  
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-secondary">{project.name}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text} items-center cursor-help`}>
                  {getProjectStatusLabel(project.status)}
                  <HelpCircle className="h-3 w-3 ml-1" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  <strong>Current Status:</strong> {getProjectStatusLabel(project.status)}
                </p>
                <p className="text-xs mt-1">
                  <strong>Documents Progress:</strong> {documentProgress}% complete
                </p>
                <p className="text-xs mt-1">
                  Your project becomes "Ready for Submission" when document progress reaches 100%.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-gray-500">Permit #{project.permitNumber} - {project.jurisdiction}</p>
      </div>
      <div className="mt-4 sm:mt-0 flex space-x-3">
        <MessageDialog 
          projectId={project.id}
          projectName={project.name}
          trigger={
            <Button variant="outline" className="flex items-center" data-testid="button-project-messages">
              <MessageCircle className="h-4 w-4 mr-1" />
              Messages
            </Button>
          }
        />
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={() => setIsEditDialogOpen(true)}
          data-testid="button-edit-project"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          onClick={onSubmit} 
          className="flex items-center"
        >
          <Send className="h-4 w-4 mr-1" />
          Submit to Authority
        </Button>
      </div>
      
      <EditProjectDialog
        project={project}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
