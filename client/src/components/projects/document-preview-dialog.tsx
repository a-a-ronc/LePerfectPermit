import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  getDocumentStatusLabel
} from "@/lib/utils/document-utils";
import { Check, FileText, Loader2, Download, X, ExternalLink } from "lucide-react";

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
  
  // Reset state when document changes
  React.useEffect(() => {
    if (document) {
      setChecklist(getChecklistForCategory(document.category));
      setReviewStatus(document.status || DocumentStatus.PENDING_REVIEW);
      setReviewComment(document.comments || "");
      
      // Simulate document preview loading
      setIsPreviewLoading(true);
      const timer = setTimeout(() => {
        setIsPreviewLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [document]);
  
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
      
      // Convert checklist to string for comments
      const checklistDetails = checklist.items
        .map(item => `[${item.checked ? 'x' : ' '}] ${item.label}`)
        .join("\n");
      
      const commentWithChecklist = 
        reviewComment.trim() ? 
        `${reviewComment}\n\n${checklist.title}:\n${checklistDetails}` : 
        `${checklist.title}:\n${checklistDetails}`;
      
      const res = await apiRequest("PATCH", `/api/documents/${document.id}`, {
        status: reviewStatus,
        comments: commentWithChecklist,
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
  
  const handleStatusChange = (status: string) => {
    setReviewStatus(status);
  };
  
  if (!document) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {formatDocumentCategory(document.category)} - {document.fileName}
          </DialogTitle>
        </DialogHeader>
        
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
                {/* For PDFs, embed the PDF viewer */}
                {document.fileType === 'application/pdf' ? (
                  <iframe 
                    src={`data:${document.fileType};base64,${document.fileContent}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full border-0"
                    title={document.fileName}
                  />
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
              <div className="text-xs text-muted-foreground">Review Checklist</div>
            </div>
            
            <div className="p-3 border-b">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Document Status</Label>
                  <div className="flex gap-2">
                    {[
                      { value: DocumentStatus.APPROVED, label: "Approve" },
                      { value: DocumentStatus.REJECTED, label: "Reject" },
                      { value: DocumentStatus.PENDING_REVIEW, label: "Keep in Review" }
                    ].map(option => {
                      const isSelected = reviewStatus === option.value;
                      const statusColors = getDocumentStatusColor(option.value);
                      
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusChange(option.value)}
                          className={isSelected ? `${statusColors.bg} ${statusColors.text} hover:${statusColors.bg}/90` : ""}
                        >
                          {option.label}
                          {isSelected && <Check className="ml-1 h-3 w-3" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="comments" className="text-xs mb-1.5 block">Review Comments</Label>
                  <textarea
                    id="comments"
                    className="w-full min-h-[80px] max-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Add notes about this document..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-3">
              <h3 className="font-medium text-sm mb-2">{checklist.title}</h3>
              
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
              
              {!checklistComplete && reviewStatus === DocumentStatus.APPROVED && (
                <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <strong>Note:</strong> Consider completing all checklist items before approving this document.
                </div>
              )}
            </div>
            
            <div className="p-3 bg-muted/20 border-t flex justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? "Saving..." : "Submit Review"}
                {!reviewMutation.isPending && <Check className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}