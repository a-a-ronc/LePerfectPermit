import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  MessageSquare, 
  Eye,
  History,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document, DocumentStatus } from "@shared/schema";
import { 
  getDocumentStatusColor, 
  getDocumentStatusLabel, 
  formatDocumentCategory,
  getDocumentCategoryDescription
} from "@/lib/utils/document-utils";
import { formatDateTime } from "@/lib/utils/date-utils";
import { DocumentVersionHistory } from "./document-version-history";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import { DocumentViewDialog } from "./document-view-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DocumentListProps {
  documents: Document[];
  projectId: number;
  isLoading?: boolean;
}

export function DocumentList({ documents, projectId, isLoading = false }: DocumentListProps) {
  const [user, setUser] = useState<any>(null);
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    
    fetchUser();
  }, []);
  const { toast } = useToast();
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [versionHistoryDialogOpen, setVersionHistoryDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>(DocumentStatus.APPROVED);
  const [reviewComment, setReviewComment] = useState("");
  
  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);
  
  // Get the latest version of each document category
  const latestDocuments = Object.entries(documentsByCategory).map(([category, docs]) => {
    // Sort by version (descending)
    const sorted = [...docs].sort((a, b) => b.version - a.version);
    return sorted[0];
  });

  // Review document mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocument) return;
      
      const res = await apiRequest("PATCH", `/api/documents/${selectedDocument.id}`, {
        status: reviewStatus,
        comments: reviewComment,
      });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure UI updates properly
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Refresh project list for progress bar
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }); // Refresh project details
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] }); // Refresh activity log
      
      setReviewDialogOpen(false);
      setSelectedDocument(null);
      setReviewComment("");
      
      toast({
        title: "Document Reviewed",
        description: `Document has been ${reviewStatus.replace('_', ' ')}.`,
      });
      
      // Force page reload to ensure everything is up-to-date
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay to allow toast to be visible
    },
    onError: () => {
      toast({
        title: "Review Failed",
        description: "There was an error reviewing the document. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleReviewDocument = (document: Document) => {
    setSelectedDocument(document);
    setReviewStatus(document.status || DocumentStatus.PENDING_REVIEW);
    setReviewComment(document.comments || "");
    setReviewDialogOpen(true);
  };

  const toggleExpand = (docId: number) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
    } else {
      setExpandedDocId(docId);
    }
  };

  // Categories in specific order
  const categories = [
    "site_plan",
    "facility_plan",
    "egress_plan",
    "structural_plans",
    "commodities",
    "fire_protection",
    "special_inspection",
    "cover_letter"
  ];
  
  // Filter and sort documents by category
  const orderedDocuments = categories
    .map(category => {
      const doc = latestDocuments.find(d => d.category === category);
      return doc || null;
    })
    .filter(doc => doc !== null) as Document[];
  
  if (isLoading) {
    return (
      <div className="p-4">
        {Array(7).fill(0).map((_, i) => (
          <div key={i} className="mb-4 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-md mr-3" />
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
              <div className="mt-3 md:mt-0 flex items-center">
                <Skeleton className="h-6 w-20 mr-3" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orderedDocuments.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
        <p className="text-gray-500 mb-4">
          Upload documents using the "Upload Document" button above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {orderedDocuments.map((doc) => {
        const isExpanded = expandedDocId === doc.id;
        const { bg, text } = getDocumentStatusColor(doc.status);
        
        return (
          <div key={doc.id} className={`border-b border-gray-200 ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
            <div 
              className="flex flex-wrap justify-between p-4 cursor-pointer" 
              onClick={() => toggleExpand(doc.id)}
            >
              <div className="w-full md:w-auto flex items-center">
                <FileText className="h-6 w-6 text-gray-500 mr-3" />
                <div>
                  <h3 className="font-medium">{formatDocumentCategory(doc.category)}</h3>
                  <p className="text-sm text-gray-500">{getDocumentCategoryDescription(doc.category)}</p>
                </div>
              </div>
              <div className="mt-3 md:mt-0 flex items-center">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text} mr-3`}>
                  {getDocumentStatusLabel(doc.status)}
                </span>
                <button className="text-primary hover:text-primary/80">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-primary mr-2" />
                      <span className="font-medium">{doc.fileName}</span>
                      {doc.version > 1 && (
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Uploaded {formatDateTime(doc.uploadedAt)}
                    </div>
                  </div>
                  
                  {doc.comments && (
                    <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm text-gray-700">{doc.comments}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a download link
                          const link = window.document.createElement('a');
                          link.href = `data:${doc.fileType};base64,${doc.fileContent}`;
                          link.download = doc.fileName;
                          window.document.body.appendChild(link);
                          link.click();
                          window.document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                          setVersionHistoryDialogOpen(true);
                        }}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Version History
                      </Button>
                      {user?.role === "specialist" && doc.status !== DocumentStatus.APPROVED && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocument(doc);
                            setPreviewDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                      
                      {/* Add revert option for approved documents */}
                      {user?.role === "specialist" && doc.status === DocumentStatus.APPROVED && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocument(doc);
                            setReviewStatus(DocumentStatus.PENDING_REVIEW);
                            setReviewComment(`Reverted from Approved status for additional review.\n\nPrevious comments: ${doc.comments || ""}`);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Revert to Review
                        </Button>
                      )}
                    </div>
                    {doc.reviewedById && (
                      <div className="mt-3 md:mt-0">
                        <div className="flex items-center text-sm text-gray-500">
                          {doc.status === DocumentStatus.APPROVED ? (
                            <>
                              <span className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span>Approved {formatDateTime(doc.reviewedAt)}</span>
                            </>
                          ) : doc.status === DocumentStatus.REJECTED ? (
                            <>
                              <span className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                              <span>Rejected {formatDateTime(doc.reviewedAt)}</span>
                            </>
                          ) : (
                            <>
                              <span className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                              <span>In review since {formatDateTime(doc.reviewedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Review the document and update its status.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="py-2">
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Document</p>
                <p className="text-sm">{selectedDocument.fileName}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Category</p>
                <p className="text-sm">{formatDocumentCategory(selectedDocument.category)}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Status</p>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DocumentStatus.APPROVED}>Approve</SelectItem>
                    <SelectItem value={DocumentStatus.REJECTED}>Reject</SelectItem>
                    <SelectItem value={DocumentStatus.PENDING_REVIEW}>Keep in Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Comments</p>
                <Textarea 
                  value={reviewComment} 
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Add comments about this document..."
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Version History Dialog */}
      {selectedDocument && (
        <DocumentVersionHistory
          isOpen={versionHistoryDialogOpen}
          onClose={() => setVersionHistoryDialogOpen(false)}
          document={selectedDocument}
          projectId={projectId}
        />
      )}
      
      {/* Document Preview Dialog with Checklist (for Review) */}
      {selectedDocument && (
        <DocumentPreviewDialog
          isOpen={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          document={selectedDocument}
          projectId={projectId}
        />
      )}
      
      {/* Document View Dialog (Simple Preview) */}
      {selectedDocument && (
        <DocumentViewDialog
          isOpen={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          document={selectedDocument}
        />
      )}
    </div>
  );
}
