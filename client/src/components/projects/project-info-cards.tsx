import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users } from "lucide-react";
import { formatDeadline } from "@/lib/utils/date-utils";
import { DocumentCategory } from "@shared/schema";
import { 
  calculateProjectDocumentProgress 
} from "@/lib/utils/document-utils";

interface ProjectInfoCardsProps {
  project: any;
  documents: any[];
  stakeholders: any[];
  isLoading?: boolean;
  onAddStakeholder: () => void;
}

export function ProjectInfoCards({ 
  project, 
  documents, 
  stakeholders, 
  isLoading = false,
  onAddStakeholder
}: ProjectInfoCardsProps) {
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </>
    );
  }

  const deadlineInfo = project.deadline ? formatDeadline(project.deadline) : null;
  
  // Calculate document progress by category
  const documentProgress: Record<string, { complete: boolean, progress: number }> = {
    [DocumentCategory.SITE_PLAN]: { complete: false, progress: 0 },
    [DocumentCategory.FACILITY_PLAN]: { complete: false, progress: 0 },
    [DocumentCategory.EGRESS_PLAN]: { complete: false, progress: 0 },
    [DocumentCategory.STRUCTURAL_PLANS]: { complete: false, progress: 0 },
    [DocumentCategory.COMMODITIES]: { complete: false, progress: 0 },
    [DocumentCategory.FIRE_PROTECTION]: { complete: false, progress: 0 },
    [DocumentCategory.SPECIAL_INSPECTION]: { complete: false, progress: 0 },
  };
  
  // Update progress based on document status
  documents.forEach(doc => {
    if (doc.category in documentProgress) {
      if (doc.status === 'approved') {
        documentProgress[doc.category].complete = true;
        documentProgress[doc.category].progress = 100;
      } else if (doc.status === 'pending_review') {
        documentProgress[doc.category].progress = 50;
      } else if (doc.status === 'not_submitted') {
        documentProgress[doc.category].progress = 0;
      }
    }
  });

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-4">Project Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className={deadlineInfo?.isUrgent ? "text-red-600 font-medium" : ""}>
                {project.status === 'ready_for_submission' ? 'Ready for Submission' : 
                project.status === 'in_progress' ? 'In Progress' : 
                project.status === 'not_started' ? 'Not Started' : 
                project.status === 'under_review' ? 'Under Review' : 
                project.status === 'approved' ? 'Approved' : 
                project.status === 'rejected' ? 'Rejected' : 
                project.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Facility Address:</span>
              <span className="text-right flex-1 ml-2">{project.facilityAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jurisdiction:</span>
              <span>{project.jurisdiction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Client:</span>
              <span>{project.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deadline:</span>
              <span className={deadlineInfo?.isUrgent ? "text-red-600 font-medium" : ""}>
                {deadlineInfo ? deadlineInfo.text : "No deadline set"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-4">Document Progress</h3>
          <div className="space-y-3">
            {Object.entries(documentProgress).map(([category, { complete, progress }]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {category === DocumentCategory.SITE_PLAN ? 'Site Plan' :
                     category === DocumentCategory.FACILITY_PLAN ? 'Facility Plan' :
                     category === DocumentCategory.EGRESS_PLAN ? 'Egress Plan' :
                     category === DocumentCategory.STRUCTURAL_PLANS ? 'Structural Plans' :
                     category === DocumentCategory.COMMODITIES ? 'Commodities Form' :
                     category === DocumentCategory.FIRE_PROTECTION ? 'Fire Protection' :
                     category === DocumentCategory.SPECIAL_INSPECTION ? 'Special Inspection' :
                     category}
                  </span>
                  <span className={complete ? "text-green-600" : progress > 0 ? "text-yellow-600" : "text-red-600"}>
                    {complete ? 'Complete' : progress > 0 ? 'In Progress' : 'Not Started'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`rounded-full h-2 ${
                      complete ? 'bg-green-500' : progress > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
            
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between font-medium">
                <span>Overall Progress</span>
                <span>{calculateProjectDocumentProgress(documents)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-4">Team</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Permit Specialists</h4>
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">ST</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">Sarah Thompson</p>
                  <p className="text-xs text-gray-500">Lead Specialist</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Stakeholders</h4>
              {stakeholders.length > 0 ? (
                <div className="space-y-3">
                  {stakeholders.map(stakeholder => (
                    <div key={stakeholder.id} className="flex items-center">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          {stakeholder.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{stakeholder.user?.fullName || 'Unknown User'}</p>
                        <p className="text-xs text-gray-500">{stakeholder.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No stakeholders assigned</div>
              )}
            </div>
            
            <Button 
              onClick={onAddStakeholder}
              variant="outline" 
              className="w-full mt-4 flex justify-center items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Stakeholder
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
