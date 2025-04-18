import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Document, DocumentStatus } from "@shared/schema";
import { getChecklistForCategory } from "@/lib/utils/checklist-data";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  formatDocumentCategory,
  getDocumentStatusColor,
} from "@/lib/utils/document-utils";
import { 
  Check, 
  FileText, 
  Loader2, 
  Download, 
  X, 
  ExternalLink, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Clock
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  projectId: number;
}

export function DocumentPreviewDialog({ isOpen, onClose, document, projectId }: DocumentPreviewDialogProps) {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState(() => 
    document ? getChecklistForCategory(document.category) : { title: "", items: [] }
  );
  const [reviewStatus, setReviewStatus] = useState<string>(
    document?.status || DocumentStatus.PENDING_REVIEW
  );
  const [reviewComment, setReviewComment] = useState<string>(document?.comments || "");
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [initialChecklist, setInitialChecklist] = useState<{title: string, items: {id: string, label: string, checked: boolean}[]}>({ title: "", items: [] });
  
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
  
  // Reset state when document changes
  React.useEffect(() => {
    if (document) {
      const categoryChecklist = getChecklistForCategory(document.category);
      setChecklist(categoryChecklist);
      setReviewStatus(document.status || DocumentStatus.PENDING_REVIEW);
      setReviewComment(document.comments || "");
      setShowRejectDialog(false);
      
      // Try to parse existing checklist from document comments
      // Only do this for PENDING_REVIEW documents
      if (document.status === DocumentStatus.PENDING_REVIEW && document.comments) {
        const parsedChecklist = parseChecklistFromComments(document.comments);
        if (parsedChecklist && parsedChecklist.items.length > 0) {
          // If we have a previously saved checklist, merge it with our category checklist
          // to preserve the checked state
          const updatedItems = categoryChecklist.items.map(item => {
            // Try to find a matching item from parsed checklist
            const matchingItem = parsedChecklist.items.find(
              parsed => parsed.label.toLowerCase() === item.label.toLowerCase()
            );
            return matchingItem ? { ...item, checked: matchingItem.checked } : item;
          });
          
          setChecklist({
            ...categoryChecklist,
            items: updatedItems
          });
        }
        
        // Store the initial checklist state for comparison
        setInitialChecklist(categoryChecklist);
      }
      
      // Simulate document preview loading
      setIsPreviewLoading(true);
      const timer = setTimeout(() => {
        setIsPreviewLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [document, parseChecklistFromComments]);
  
  const toggleChecklistItem = useCallback((itemId: string) => {
    setChecklist(prevChecklist => ({
      ...prevChecklist,
      items: prevChecklist.items.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }));
  }, []);
  
  const checklistComplete = checklist.items.every(item => item.checked);
  
  // Review document mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!document) return;
      
      let comments = "";
      
      // Different comment handling based on status
      if (reviewStatus === DocumentStatus.REJECTED) {
        // For rejections, just use the rejection reason
        comments = reviewComment.trim();
      } else if (reviewStatus === DocumentStatus.APPROVED) {
        // For approvals, include the full checklist with review comments
        comments = reviewComment.trim() 
          ? `${reviewComment}\n\n${checklist.title}:\n${checklist.items
              .map(item => `[${item.checked ? 'x' : ' '}] ${item.label}`)
              .join("\n")}`
          : `${checklist.title}:\n${checklist.items
              .map(item => `[${item.checked ? 'x' : ' '}] ${item.label}`)
              .join("\n")}`;
      } else if (reviewStatus === DocumentStatus.PENDING_REVIEW) {
        // For "Keep in Review", just save the checklist state
        comments = `${checklist.title}:\n${checklist.items
          .map(item => `[${item.checked ? 'x' : ' '}] ${item.label}`)
          .join("\n")}`;
      }
      
      const res = await apiRequest("PATCH", `/api/documents/${document.id}`, {
        status: reviewStatus,
        comments: comments,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure UI updates properly
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Refresh project list for progress bar
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }); // Refresh project details
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] }); // Refresh activity log
      
      onClose();
      
      toast({
        title: "Document Reviewed",
        description: `Document has been ${reviewStatus.replace('_', ' ')}.`,
      });
      
      // Force page reload to ensure everything is up-to-date
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay to allow toast to be visible
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message || "There was an error reviewing the document. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleApprove = () => {
    if (!checklistComplete) {
      toast({
        title: "Checklist Incomplete",
        description: "All checklist items must be completed before approving this document.",
        variant: "destructive"
      });
      return;
    }
    
    setReviewStatus(DocumentStatus.APPROVED);
    reviewMutation.mutate();
  };
  
  const handleReject = () => {
    setReviewComment(""); // Clear any existing comment
    setShowRejectDialog(true);
  };
  
  const handleKeepInReview = () => {
    setReviewStatus(DocumentStatus.PENDING_REVIEW);
    reviewMutation.mutate();
  };
  
  const submitRejection = () => {
    if (!reviewComment || reviewComment.trim() === '') {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this document.",
        variant: "destructive"
      });
      return;
    }
    
    setReviewStatus(DocumentStatus.REJECTED);
    reviewMutation.mutate();
  };
  
  if (!document) return null;
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {formatDocumentCategory(document.category)} - {document.fileName}
            </DialogTitle>
            <DialogDescription>
              Review document and complete checklist
            </DialogDescription>
          </DialogHeader>
          
          {document.status === DocumentStatus.REJECTED && document.comments && (
            <Alert variant="destructive" className="mt-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Rejection Reason</AlertTitle>
              <AlertDescription className="max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                {document.comments}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-1 gap-4 mt-4 overflow-hidden">
            {/* Document preview */}
            <div className="flex-1 min-w-0 border rounded-md overflow-hidden bg-muted/20 flex items-center justify-center relative">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading document preview...</p>
                </div>
              ) : (
                <>
                  {/* For PDFs, embed the PDF viewer using blob URL for better compatibility */}
                  {document.fileType === 'application/pdf' ? (
                    <PDFViewer document={document} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-center text-muted-foreground mb-2">
                        {document.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        ({(document.fileSize / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                      <p className="text-xs text-muted-foreground mb-6 max-w-md text-center">
                        {document.fileType !== 'application/pdf' 
                          ? `This file type (${document.fileType}) can't be previewed directly in the browser. Please download to view.` 
                          : "PDF preview is available. If you're having trouble viewing it, please download the file."}
                      </p>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            // Create a blob URL for better browser compatibility
                            const byteCharacters = atob(document.fileContent);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], {type: document.fileType});
                            const blobUrl = URL.createObjectURL(blob);
                            
                            // Open in new window
                            window.open(blobUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in new window
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Create a download link
                            const link = window.document.createElement('a');
                            link.href = `data:${document.fileType};base64,${document.fileContent}`;
                            link.download = document.fileName;
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Checklist sidebar */}
            <div className="w-80 flex-shrink-0 border rounded-md overflow-hidden flex flex-col bg-card">
              <div className="p-3 bg-muted/40 border-b flex flex-col gap-1">
                <h3 className="font-medium text-sm">{formatDocumentCategory(document.category)}</h3>
                <div className="text-xs text-muted-foreground">{document.fileName}</div>
              </div>
              
              <div className="flex-1 overflow-auto p-3">              
                {/* Show only the checklist when in review mode */}
                {(document.status === DocumentStatus.PENDING_REVIEW || reviewStatus === DocumentStatus.PENDING_REVIEW) && (
                  <>
                    <h4 className="font-medium text-sm mb-3">Review Checklist</h4>
                    <div className="space-y-2">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <Checkbox
                            id={item.id}
                            checked={item.checked}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                          />
                          <Label
                            htmlFor={item.id}
                            className="text-sm leading-tight cursor-pointer"
                          >
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {!checklistComplete && (
                      <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                        <strong>Note:</strong> All checklist items must be completed to approve this document.
                      </div>
                    )}
                  </>
                )}
                
                {/* Show rejection reason if document is rejected */}
                {document.status === DocumentStatus.REJECTED && document.comments && (
                  <div className="mt-2">
                    <h4 className="font-medium text-sm mb-2">Rejection Reason</h4>
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-wrap">
                      {document.comments}
                    </div>
                  </div>
                )}
                
                {/* Show saved checklist if document is approved */}
                {document.status === DocumentStatus.APPROVED && document.comments && (
                  <div className="mt-2">
                    <h4 className="font-medium text-sm mb-2">Approval Checklist</h4>
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="whitespace-pre-wrap">{document.comments}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleKeepInReview}
                  disabled={reviewMutation.isPending}
                  className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Keep in Review
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleApprove}
                  disabled={!checklistComplete || reviewMutation.isPending}
                  className={`${
                    checklistComplete 
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Rejection reason dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejection Reason</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter rejection reason..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            {(!reviewComment || reviewComment.trim() === '') && (
              <p className="text-xs text-red-500 mt-1">
                A rejection reason is required
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitRejection}
              className="bg-red-600 hover:bg-red-700"
              disabled={!reviewComment || reviewComment.trim() === ''}
            >
              Reject Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}