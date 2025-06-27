import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";

import { Header } from "@/components/layout/header";
import { ProjectDetailsHeader } from "@/components/projects/project-details-header";
import { ProjectInfoCards } from "@/components/projects/project-info-cards";
import { DocumentList } from "@/components/projects/document-list";
import { DocumentUploadDialog } from "@/components/projects/document-upload-dialog";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AddStakeholderDialog } from "@/components/stakeholders/add-stakeholder-dialog";
import { TeamManagementPanel } from "@/components/stakeholders/team-management-panel";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommoditiesForm } from "@/components/commodities/commodities-form";
import { calculateProjectDocumentProgress } from "@/lib/utils/document-utils";
import { ProjectStatus } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { createSubmissionZipNative } from "@/lib/utils/zip-creator";

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("documents");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isStakeholderDialogOpen, setIsStakeholderDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isCoverLetterDialogOpen, setIsCoverLetterDialogOpen] = useState(false);
  
  // Form state with localStorage persistence
  const [editableContactEmail, setEditableContactEmail] = useState(() => 
    localStorage.getItem('coverLetter_contactEmail') || ""
  );
  const [editableContactPhone, setEditableContactPhone] = useState(() => 
    localStorage.getItem('coverLetter_contactPhone') || ""
  );
  const [editableProjectName, setEditableProjectName] = useState(() => 
    localStorage.getItem('coverLetter_projectName') || ""
  );
  const [editableCustomerName, setEditableCustomerName] = useState(() => 
    localStorage.getItem('coverLetter_customerName') || ""
  );
  const [editableFacilityAddress, setEditableFacilityAddress] = useState(() => 
    localStorage.getItem('coverLetter_facilityAddress') || ""
  );
  const [editableJurisdiction, setEditableJurisdiction] = useState(() => 
    localStorage.getItem('coverLetter_jurisdiction') || ""
  );
  const [editableJurisdictionAddress, setEditableJurisdictionAddress] = useState(() => 
    localStorage.getItem('coverLetter_jurisdictionAddress') || ""
  );

  // Export documents mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      // Get all documents with content for export
      const documentsWithContent = await Promise.all(
        documents.map(async (doc) => {
          const response = await fetch(`/api/documents/${doc.id}/content`, {
            credentials: 'include'
          });
          if (!response.ok) throw new Error('Failed to fetch document content');
          return response.json();
        })
      );

      // Find cover letter
      const coverLetterDoc = documentsWithContent.find(doc => 
        doc.category === 'cover_letter' || doc.fileName.toLowerCase().includes('cover')
      );

      if (!coverLetterDoc) {
        throw new Error('Cover letter not found');
      }

      // Create export package using the new ZIP creator
      return await createSubmissionZipNative(
        atob(coverLetterDoc.fileContent),
        documentsWithContent
          .filter(doc => doc.category !== 'cover_letter')
          .map(doc => ({
            fileName: doc.fileName,
            fileContent: doc.fileContent,
            category: doc.category
          })),
        project.name
      );
    },
    onSuccess: (success) => {
      if (success) {
        // Success message is handled by the zip creator notification
        console.log('Document package export completed successfully');
      } else {
        toast({
          title: "Export Failed", 
          description: "Could not create document package. Try downloading files individually.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast({
        title: "Export Error",
        description: "Failed to export documents.",
        variant: "destructive",
      });
    }
  });

  const handleExportDocuments = () => {
    exportMutation.mutate();
  };

  const handleSubmitToAuthority = () => {
    // Create email subject and body
    const subject = `${project.name}: High-Piled Storage Permit Submission`;
    const body = `Dear ${project.jurisdiction ? project.jurisdiction + ' Building' : 'Building'} Department,

Please find attached our permit submission for the following project:

Project Name: ${project.name}
Permit Number: ${project.permitNumber}
Location: ${project.location}
Jurisdiction: ${project.jurisdiction}

This submission includes all required documentation for the high-piled storage permit application. Please review and let us know if any additional information is needed.

Thank you for your time and consideration.

Best regards,
${user?.fullName || 'Permit Specialist'}
${user?.defaultContactEmail || 'permits@intralog.io'}
${user?.defaultContactPhone || '(714) 697-6431'}`;

    // Create Outlook mailto link
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Outlook
    window.location.href = mailtoLink;
  };

  // Persist form values to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('coverLetter_contactEmail', editableContactEmail);
  }, [editableContactEmail]);

  useEffect(() => {
    localStorage.setItem('coverLetter_contactPhone', editableContactPhone);
  }, [editableContactPhone]);

  useEffect(() => {
    localStorage.setItem('coverLetter_projectName', editableProjectName);
  }, [editableProjectName]);

  useEffect(() => {
    localStorage.setItem('coverLetter_customerName', editableCustomerName);
  }, [editableCustomerName]);

  useEffect(() => {
    localStorage.setItem('coverLetter_facilityAddress', editableFacilityAddress);
  }, [editableFacilityAddress]);

  useEffect(() => {
    localStorage.setItem('coverLetter_jurisdiction', editableJurisdiction);
  }, [editableJurisdiction]);

  useEffect(() => {
    localStorage.setItem('coverLetter_jurisdictionAddress', editableJurisdictionAddress);
  }, [editableJurisdictionAddress]);

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
      // Update user's default contact information
      await apiRequest("PUT", "/api/user/contact-defaults", {
        defaultContactEmail: editableContactEmail,
        defaultContactPhone: editableContactPhone,
      });
      
      const res = await apiRequest("POST", `/api/projects/${projectId}/generate-cover-letter`, {
        contactEmail: editableContactEmail,
        contactPhone: editableContactPhone,
        projectName: editableProjectName,
        customerName: editableCustomerName,
        facilityAddress: editableFacilityAddress,
        jurisdiction: editableJurisdiction,
        jurisdictionAddress: editableJurisdictionAddress,
      });
      
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
        variant: "default",
        duration: 5000 // Show for longer time so user has time to notice
      });
      
      // Always force a page reload after generating the cover letter
      // This ensures the letter appears correctly and with all the right details
      setTimeout(() => {
        window.location.reload();
      }, 1200); // Short delay to ensure the toast message is seen first
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
      <div className="min-h-screen">
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
    // Use stored values if they exist, otherwise fall back to project defaults
    const defaultEmail = editableContactEmail || (project as any)?.contactEmail || (user as any)?.defaultContactEmail || (user as any)?.email || "permits@intralog.io";
    const defaultPhone = editableContactPhone || (project as any)?.contactPhone || (user as any)?.defaultContactPhone || "(801) 441-8992";
    const defaultProjectName = editableProjectName || (project as any)?.name || "West Valley Relocation";
    const defaultCustomerName = editableCustomerName || (project as any)?.clientName || "";
    const defaultFacilityAddress = editableFacilityAddress || (project as any)?.facilityAddress || "";
    const defaultJurisdiction = editableJurisdiction || (project as any)?.jurisdiction || "";
    
    // Set values with persistence
    setEditableContactEmail(defaultEmail);
    setEditableContactPhone(defaultPhone);
    setEditableProjectName(defaultProjectName);
    setEditableCustomerName(defaultCustomerName);
    setEditableFacilityAddress(defaultFacilityAddress);
    setEditableJurisdiction(defaultJurisdiction);
    
    // Auto-resolve jurisdiction address
    const resolvedAddress = editableJurisdictionAddress || (project as any)?.jurisdictionAddress || resolveJurisdictionAddress(defaultJurisdiction);
    setEditableJurisdictionAddress(resolvedAddress);
    
    setIsCoverLetterDialogOpen(true);
  };

  // Function to resolve jurisdiction address (same logic as server)
  const resolveJurisdictionAddress = (jurisdiction: string): string => {
    const jurisdictionMap: Record<string, string> = {
      "West Valley City": "3600 S Constitution Blvd, West Valley City, UT 84119",
      "Salt Lake City": "451 S State St, Salt Lake City, UT 84111",
      "Murray": "5025 S State St, Murray, UT 84107",
      "Sandy": "10000 Centennial Pkwy, Sandy, UT 84070",
      "South Jordan": "1600 W Towne Center Dr, South Jordan, UT 84095",
      "Midvale": "655 W Center St, Midvale, UT 84047",
      "Draper": "1020 E Pioneer Rd, Draper, UT 84020",
      "Taylorsville": "2600 W Taylorsville Blvd, Taylorsville, UT 84129",
      "Millcreek": "3330 S 1300 E, Millcreek, UT 84106",
      "Cottonwood Heights": "2277 E Bengal Blvd, Cottonwood Heights, UT 84121"
    };
    
    return jurisdictionMap[jurisdiction] || `${jurisdiction} Building Department`;
  };

  return (
    <div className="min-h-screen">
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
                onSubmit={handleSubmitToAuthority}
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
                  <TabsTrigger value="team">Team</TabsTrigger>
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
                          >
                            Generate AI Cover Letter
                          </Button>
                          {documents.some(doc => doc.category === 'cover_letter') && (
                            <Button 
                              variant="outline"
                              onClick={handleExportDocuments}
                              disabled={exportMutation.isPending}
                            >
                              {exportMutation.isPending ? "Exporting..." : "Export"}
                            </Button>
                          )}
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
                
                <TabsContent value="team" className="mt-6">
                  <TeamManagementPanel projectId={projectId} />
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
      

      
      {/* Generate Cover Letter Dialog */}
      <Dialog open={isCoverLetterDialogOpen} onOpenChange={setIsCoverLetterDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate AI Cover Letter</DialogTitle>
            <DialogDescription>
              Review and edit project information before generating the cover letter.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={editableProjectName}
                  onChange={(e) => setEditableProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  value={editableCustomerName}
                  onChange={(e) => setEditableCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="facility-address">Facility Address</Label>
              <Input
                id="facility-address"
                value={editableFacilityAddress}
                onChange={(e) => setEditableFacilityAddress(e.target.value)}
                placeholder="Enter facility address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={editableJurisdiction}
                  onChange={(e) => {
                    setEditableJurisdiction(e.target.value);
                    // Auto-update jurisdiction address when jurisdiction changes
                    const resolvedAddress = resolveJurisdictionAddress(e.target.value);
                    setEditableJurisdictionAddress(resolvedAddress);
                  }}
                  placeholder="Enter jurisdiction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction-address">Jurisdiction Address</Label>
                <Input
                  id="jurisdiction-address"
                  value={editableJurisdictionAddress}
                  onChange={(e) => setEditableJurisdictionAddress(e.target.value)}
                  placeholder="Building department address"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={editableContactEmail}
                  onChange={(e) => setEditableContactEmail(e.target.value)}
                  placeholder="permits@intralog.io"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={editableContactPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    let formatted = '';
                    if (value.length > 0) {
                      formatted = '(' + value.substring(0, 3);
                      if (value.length > 3) {
                        formatted += ') ' + value.substring(3, 6);
                        if (value.length > 6) {
                          formatted += '-' + value.substring(6, 10);
                        }
                      }
                    }
                    setEditableContactPhone(formatted);
                  }}
                  placeholder="(714) 697-6431"
                  maxLength={14}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                All project details can be edited here to ensure accuracy before generating the cover letter.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCoverLetterDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={generateCoverLetterMutation.isPending || !editableContactEmail.trim() || !editableContactPhone.trim() || !editableProjectName.trim() || !editableFacilityAddress.trim() || !editableJurisdiction.trim()} 
              onClick={() => generateCoverLetterMutation.mutate()}
            >
              {generateCoverLetterMutation.isPending ? "AI Generating..." : "Generate AI Cover Letter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
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
