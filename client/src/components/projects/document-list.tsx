import React, { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  MessageSquare, 
  Eye,
  History,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  Upload,
  Trash
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
import { DocumentUploadDialog } from "./document-upload-dialog";
import { getChecklistForCategory } from "@/lib/utils/checklist-data";
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

  // Delete document confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/documents/${documentId}`);
      return res.ok;
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure UI updates properly
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Refresh project list for progress bar
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }); // Refresh project details
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] }); // Refresh activity log
      
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the document. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle document deletion
  const handleDeleteDocument = (document: Document, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  // Confirm document deletion
  const confirmDeleteDocument = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
    }
  };

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
  
  // Parse existing comments to extract saved checklist state if available
  const parseChecklistFromComments = useCallback((comments: string) => {
    if (!comments) return null;
    
    // Check if the comments contain a checklist format
    const checklistMatch = comments.match(/\[(x| )\] .+/g);
    if (!checklistMatch) return null;
    
    const title = comments.split('\n')[0];
    
    const items = checklistMatch.map((line, idx) => {
      const checked = line.startsWith('[x]');
      const label = line.replace(/\[(x| )\] /, '');
      return {
        id: `existing-${idx}`,
        label,
        checked
      };
    });
    
    return { title, items };
  }, []);

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
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<string>("");
  
  // Create a map of all categories with their documents (or null if no document exists)
  const categoriesWithDocuments = categories.map(category => {
    const doc = latestDocuments.find(d => d.category === category);
    return { 
      category, 
      document: doc || null 
    };
  });
  
  // Filter out null documents for operations that need actual documents
  const orderedDocuments = categoriesWithDocuments
    .filter(item => item.document !== null)
    .map(item => item.document) as Document[];
  
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

  // Handler for category-specific uploads
  const handleCategoryUpload = (category: string) => {
    setSelectedUploadCategory(category);
    setUploadDialogOpen(true);
  };

  return (
    <div className="overflow-hidden">
      {categoriesWithDocuments.map(({ category, document }) => {
        // Create a unique key for each category row
        const rowKey = document ? `doc-${document.id}` : `category-${category}`;
        
        if (!document) {
          // If this category doesn't have a document yet, show placeholder with upload button
          return (
            <div key={rowKey} className="border-b border-gray-200 bg-white">
              <div className="flex flex-wrap justify-between p-4">
                <div className="w-full md:w-auto flex items-center">
                  <FileText className="h-6 w-6 text-gray-400 mr-3" />
                  <div>
                    <h3 className="font-medium">{formatDocumentCategory(category)}</h3>
                    <p className="text-sm text-gray-500">{getDocumentCategoryDescription(category)}</p>
                  </div>
                </div>
                <div className="mt-3 md:mt-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center"
                    onClick={() => handleCategoryUpload(category)}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Document
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        
        // For categories with documents, show the document details
        const doc = document; // for readability in the JSX below
        const isExpanded = expandedDocId === doc.id;
        const { bg, text } = getDocumentStatusColor(doc.status);
        
        return (
          <div key={rowKey} className={`border-b border-gray-200 ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
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
              <div className="mt-3 md:mt-0 flex items-center gap-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
                  {getDocumentStatusLabel(doc.status)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryUpload(doc.category);
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => handleDeleteDocument(doc, e)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
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
                  
                  {/* Show appropriate content based on document status */}
                  {doc.status === DocumentStatus.REJECTED && doc.comments && (
                    <div className="mb-3 p-3 rounded border bg-red-50 border-red-200">
                      <div className="flex items-center mb-1 text-red-700 font-medium text-sm">
                        <AlertCircle className="h-4 w-4 mr-1.5" />
                        Rejection Reason
                      </div>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">{doc.comments}</p>
                    </div>
                  )}
                  
                  {/* Show checklist for Approved documents */}
                  {doc.status === DocumentStatus.APPROVED && doc.comments && (
                    <div className="mb-3 p-3 rounded border bg-green-50 border-green-200">
                      <div className="flex items-center mb-2 text-green-700 font-medium text-sm">
                        <Check className="h-4 w-4 mr-1.5" />
                        Approval Checklist
                      </div>
                      
                      {(() => {
                        const parsedChecklist = parseChecklistFromComments(doc.comments);
                        
                        if (parsedChecklist && parsedChecklist.items.length > 0) {
                          // Render checklist items
                          return (
                            <div className="space-y-1.5">
                              {parsedChecklist.items.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <div className="h-4 w-4 mt-0.5 rounded border border-green-500 bg-green-100 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </div>
                                  <span className="text-sm text-green-700">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          // Fallback to showing comments
                          return <p className="text-sm text-green-700">{doc.comments}</p>;
                        }
                      })()}
                    </div>
                  )}
                  
                  {/* Show partial checklist for In Review documents */}
                  {doc.status === DocumentStatus.PENDING_REVIEW && doc.comments && (
                    <div className="mb-3 p-3 rounded border bg-amber-50 border-amber-200">
                      <div className="flex items-center mb-2 text-amber-700 font-medium text-sm">
                        <History className="h-4 w-4 mr-1.5" />
                        Review Progress
                      </div>
                      
                      {(() => {
                        const parsedChecklist = parseChecklistFromComments(doc.comments);
                        
                        if (parsedChecklist && parsedChecklist.items.length > 0) {
                          // Get category checklist to ensure we show all items
                          const categoryChecklist = getChecklistForCategory(doc.category);
                          // Map parsed items to category items for display
                          const displayItems = categoryChecklist.items.map(item => {
                            const parsedItem = parsedChecklist.items.find(
                              parsed => parsed.label.toLowerCase() === item.label.toLowerCase()
                            );
                            return {
                              ...item,
                              checked: parsedItem ? parsedItem.checked : false
                            };
                          });
                          
                          return (
                            <div className="space-y-1.5">
                              {displayItems.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  {item.checked ? (
                                    <div className="h-4 w-4 mt-0.5 rounded border border-amber-500 bg-amber-100 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-amber-600" />
                                    </div>
                                  ) : (
                                    <div className="h-4 w-4 mt-0.5 rounded border border-amber-300 bg-white"></div>
                                  )}
                                  <span className="text-sm text-amber-700">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          // Fallback to showing comments
                          return <p className="text-sm text-amber-700">{doc.comments}</p>;
                        }
                      })()}
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

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        projectId={projectId}
        category={selectedUploadCategory}
      />

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
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Comments</p>
                  {reviewStatus === DocumentStatus.REJECTED && (
                    <span className="text-red-500 text-xs font-medium flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Required for rejection
                    </span>
                  )}
                </div>
                <Textarea 
                  value={reviewComment} 
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={reviewStatus === DocumentStatus.REJECTED 
                    ? "Please specify why this document is being rejected..." 
                    : "Add comments about this document..."}
                  rows={4}
                  className={`${
                    reviewStatus === DocumentStatus.REJECTED 
                      ? (!reviewComment || reviewComment.trim() === '') 
                        ? 'border-red-300 focus-visible:ring-red-500' 
                        : 'border-green-300 focus-visible:ring-green-500'
                      : ''
                  }`}
                />
                {reviewStatus === DocumentStatus.REJECTED && (!reviewComment || reviewComment.trim() === '') && (
                  <p className="text-xs text-red-500 mt-1">
                    You must provide a reason for rejecting this document.
                  </p>
                )}
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
              onClick={() => {
                // If the document is being rejected, ensure there's a reason provided
                if (reviewStatus === DocumentStatus.REJECTED && (!reviewComment || reviewComment.trim() === '')) {
                  toast({
                    title: "Rejection Reason Required",
                    description: "Please provide a reason for rejecting this document in the comments field.",
                    variant: "destructive"
                  });
                  return;
                }
                
                reviewMutation.mutate();
              }}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {documentToDelete && (
              <div className="flex items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                <FileText className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <p className="font-medium text-sm">{documentToDelete.fileName}</p>
                  <p className="text-xs text-gray-500">{formatDocumentCategory(documentToDelete.category)}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex items-center"
              onClick={confirmDeleteDocument}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-1" />
                  Delete Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
