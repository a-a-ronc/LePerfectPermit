import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProjectDetailsHeader } from "@/components/projects/project-details-header";
import { ProjectInfoCards } from "@/components/projects/project-info-cards";
import { DocumentList } from "@/components/projects/document-list";
import { DocumentUploadDialog } from "@/components/projects/document-upload-dialog";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AddStakeholderDialog } from "@/components/stakeholders/add-stakeholder-dialog";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Send } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CommoditiesForm } from "@/components/commodities/commodities-form";
import { calculateProjectDocumentProgress } from "@/lib/utils/document-utils";
import { ProjectStatus } from "@shared/schema";

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("documents");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isStakeholderDialogOpen, setIsStakeholderDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isCoverLetterDialogOpen, setIsCoverLetterDialogOpen] = useState(false);

  // Load project details
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Load project documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: [`/api/projects/${projectId}/documents`],
    enabled: !!projectId,
  });

  // Load project stakeholders
  const { data: stakeholders = [], isLoading: isLoadingStakeholders } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
    enabled: !!projectId,
  });

  // Load project activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: [`/api/projects/${projectId}/activities`],
    enabled: !!projectId,
  });

  // Load commodities data
  const { data: commodities = [], isLoading: isLoadingCommodities } = useQuery({
    queryKey: [`/api/projects/${projectId}/commodities`],
    enabled: !!projectId,
  });

  const isLoading = isLoadingProject || isLoadingDocuments || isLoadingStakeholders || isLoadingActivities;

  // Generate cover letter mutation
  const generateCoverLetterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/generate-cover-letter`);
      
      if (!res.ok) {
        throw new Error(`Failed to generate cover letter: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Close the dialog first
      setIsCoverLetterDialogOpen(false);
      
      // Force invalidation of queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Refresh project list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }); // Refresh project details
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] }); // Refresh activity log
      
      // Switch to documents tab to make sure user can see the generated cover letter
      setActiveTab("documents");
      
      // Show a success toast
      toast({
        title: "AI Cover Letter Generated",
        description: "Your AI-powered cover letter has been created and saved in the Cover Letter category.",
        variant: "success",
        duration: 5000 // Show for longer time so user has time to notice
      });
      
      // Use a longer timeout to ensure the document list has fully refreshed
      setTimeout(() => {
        try {
          // Try to find the cover letter category element
          const coverLetterElement = document.getElementById("category-cover_letter");
          
          if (coverLetterElement) {
            // Scroll to the element to make it visible
            coverLetterElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Find the clickable area within the cover letter section
            const clickableArea = coverLetterElement.querySelector('div.cursor-pointer');
            if (clickableArea) {
              // Simulate a click to expand it
              (clickableArea as HTMLElement).click();
              
              // Flash highlight effect to draw attention
              coverLetterElement.classList.add('bg-primary-50');
              setTimeout(() => {
                coverLetterElement.classList.remove('bg-primary-50');
              }, 1500);
            }
          } else {
            console.warn("Cover letter element not found in DOM after generation");
            // Force reload as a last resort if element isn't found
            window.location.reload();
          }
        } catch (error) {
          console.error("Error highlighting cover letter:", error);
        }
      }, 1500); // Slightly longer delay for better reliability
    },
    onError: (error) => {
      console.error("Cover letter generation error:", error);
      
      toast({
        title: "Generation Failed",
        description: "Failed to generate cover letter. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Submit project mutation (changes status to ready_for_submission)
  const submitProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}`, {
        status: ProjectStatus.READY_FOR_SUBMISSION
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setIsSubmitDialogOpen(false);
      toast({
        title: "Project Submitted",
        description: "The project has been marked as ready for submission.",
      });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit project. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (!isLoading && !project) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-grow overflow-hidden">
          <Header breadcrumb={[
            { label: "Dashboard", href: "/" },
            { label: "Projects", href: "/projects" },
            { label: "Project Not Found" }
          ]} />
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Project Not Found</AlertTitle>
              <AlertDescription>
                The project you're looking for does not exist or you don't have access to it.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/projects")} className="mt-4">
              Go Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate document progress
  const progress = calculateProjectDocumentProgress(documents);
  
  // Check if project is ready for submission
  const isReadyForSubmission = progress === 100 && documents.some(doc => doc.category === 'cover_letter');
  
  // All required document categories that must be approved before generating a cover letter
  const requiredDocumentCategories = [
    "site_plan",
    "facility_plan",
    "egress_plan",
    "structural_plans",
    "commodities",
    "fire_protection",
    "special_inspection"
  ];
  
  const handleGenerateCoverLetter = () => {
    // Check which categories have approved documents
    const approvedCategories = new Set();
    documents.forEach(doc => {
      if (doc.status === 'approved') {
        approvedCategories.add(doc.category);
      }
    });
    
    // Check if any required categories are missing approval
    const missingCategories = requiredDocumentCategories.filter(
      category => !approvedCategories.has(category)
    );
    
    if (missingCategories.length > 0) {
      const formattedMissingCategories = missingCategories
        .map(cat => cat.replace(/_/g, ' '))
        .map(cat => cat.charAt(0).toUpperCase() + cat.slice(1))
        .join(', ');
      
      toast({
        title: "Cannot Generate Cover Letter",
        description: `The following documents still need approval: ${formattedMissingCategories}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsCoverLetterDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-grow overflow-hidden">
        <Header breadcrumb={[
          { label: "Dashboard", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: isLoading ? "Loading..." : project.name }
        ]} />
        
        <div className="p-6 overflow-auto h-[calc(100vh-64px)]">
          {isLoading ? (
            <ProjectDetailsSkeleton />
          ) : (
            <>
              <ProjectDetailsHeader 
                project={project} 
                onSubmit={() => setIsSubmitDialogOpen(true)}
                documentProgress={progress}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <ProjectInfoCards 
                  project={project} 
                  documents={documents} 
                  stakeholders={stakeholders}
                  onAddStakeholder={() => setIsStakeholderDialogOpen(true)}
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="commodities">Commodities Form</TabsTrigger>
                  <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="documents" className="mt-6">
                  <Card>
                    <CardContent className="p-0">
                      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Document Categories</h2>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleGenerateCoverLetter}
                            disabled={requiredDocumentCategories.some(category => 
                              !documents.some(doc => doc.category === category && doc.status === 'approved')
                            )}
                          >
                            Generate AI Cover Letter
                          </Button>
                          <Button onClick={() => setIsUploadDialogOpen(true)}>
                            Upload Document
                          </Button>
                        </div>
                      </div>
                      <DocumentList 
                        documents={documents} 
                        projectId={projectId}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="commodities" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold mb-4">Commodities Information</h2>
                      <CommoditiesForm 
                        projectId={projectId} 
                        existingData={commodities[0] || null}
                        isLoading={isLoadingCommodities}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="activity" className="mt-6">
                  <Card>
                    <CardContent className="p-0">
                      <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">Activity Timeline</h2>
                      </div>
                      <div className="p-4">
                        <ActivityTimeline activities={activities} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
      
      {/* Upload Document Dialog */}
      <DocumentUploadDialog 
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        projectId={projectId}
      />
      
      {/* Add Stakeholder Dialog */}
      <AddStakeholderDialog
        isOpen={isStakeholderDialogOpen}
        onClose={() => setIsStakeholderDialogOpen(false)}
        projectId={projectId}
      />
      
      {/* Submit Project Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this project as ready for submission to the municipality?
              This will change the project status and notify all stakeholders.
            </DialogDescription>
          </DialogHeader>
          
          {!isReadyForSubmission && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Requirements</AlertTitle>
              <AlertDescription>
                To submit this project, all documents must be approved and a cover letter must be generated.
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSubmitDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={!isReadyForSubmission || submitProjectMutation.isPending} 
              onClick={() => submitProjectMutation.mutate()}
            >
              {submitProjectMutation.isPending ? "Submitting..." : "Submit Project"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generate Cover Letter Dialog */}
      <Dialog open={isCoverLetterDialogOpen} onOpenChange={setIsCoverLetterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI-Powered Cover Letter</DialogTitle>
            <DialogDescription>
              Our AI will generate a professional cover letter based on all approved documents.
              The cover letter will include project details, document references, and be formatted
              according to industry standards for high-piled storage permit submissions.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCoverLetterDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={generateCoverLetterMutation.isPending} 
              onClick={() => generateCoverLetterMutation.mutate()}
            >
              {generateCoverLetterMutation.isPending ? "AI Generating..." : "Generate AI Cover Letter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      
      <Skeleton className="h-10 w-96" />
      
      <Skeleton className="h-96" />
    </div>
  );
}
