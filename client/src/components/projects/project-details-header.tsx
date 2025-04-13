import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Edit, Send } from "lucide-react";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";
import { Project } from "@shared/schema";

interface ProjectDetailsHeaderProps {
  project: Project;
  documentProgress: number;
  onSubmit: () => void;
}

export function ProjectDetailsHeader({ project, documentProgress, onSubmit }: ProjectDetailsHeaderProps) {
  const { bg, text } = getProjectStatusColor(project.status);
  const isSubmittable = documentProgress === 100 && project.status !== 'ready_for_submission' && project.status !== 'approved';
  
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-secondary">{project.name}</h1>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
            {getProjectStatusLabel(project.status)}
          </span>
        </div>
        <p className="text-gray-500">Permit #{project.permitNumber} - {project.jurisdiction}</p>
      </div>
      <div className="mt-4 sm:mt-0 flex space-x-3">
        <Button variant="outline" className="flex items-center">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={!isSubmittable}
          className="flex items-center"
        >
          <Send className="h-4 w-4 mr-1" />
          Submit to Authority
        </Button>
      </div>
    </div>
  );
}
