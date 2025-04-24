import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document, DocumentStatus } from "@shared/schema";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import { 
  Download, 
  FileText, 
  Loader2, 
  ExternalLink, 
  AlertCircle,
  FileCode 
} from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface DocumentViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
}

export function DocumentViewDialog({ isOpen, onClose, document }: DocumentViewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Reset loading state and create reference to the document
  useEffect(() => {
    if (document) {
      setIsLoading(true);
      
      // For text files, process immediately
      if (document.fileType === 'text/plain') {
        setIsLoading(false);
      } else {
        // For other files, add a small loading delay
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [document]);
  
  if (!document) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {formatDocumentCategory(document.category)} - {document.fileName}
          </DialogTitle>
          <DialogDescription>
            Document preview
          </DialogDescription>
        </DialogHeader>
        
        {document.status === DocumentStatus.REJECTED && document.comments && (
          <Alert variant="destructive" className="mt-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Document Rejected</AlertTitle>
            <AlertDescription>
              {document.comments}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex-1 mt-4 overflow-hidden border rounded-md bg-muted/20 flex items-center justify-center relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document preview...</p>
            </div>
          ) : (
            <>
              {/* Use our file viewer component which now handles both PDFs and text files */}
              {document.fileType === 'application/pdf' || document.fileType === 'text/plain' ? (
                <>
                  <PDFViewer document={document} />
                  {/* Add Open in New Window button at bottom right */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="bg-primary/90 text-white hover:bg-primary backdrop-blur"
                      onClick={() => {
                        try {
                          // Create safe URL method with fallbacks
                          let url;
                          
                          // Try direct data URL first as the most reliable method
                          url = `data:${document.fileType};base64,${document.fileContent}`;
                          window.open(url, '_blank');
                          return;
                          
                          /* Keeping the below code commented out as a fallback if we need more complex handling later 
                          // For text files - simple approach
                          if (document.fileType === 'text/plain') {
                            try {
                              // Try to decode from base64 - might not always work if the encoding is invalid
                              // Instead use a direct data URL which browsers handle better
                              url = `data:text/plain;base64,${document.fileContent}`;
                              window.open(url, '_blank');
                              return;
                            } catch (textError) {
                              console.error("Error processing text:", textError);
                              // Fall through to data URI approach
                            }
                          }
                          
                          // For other file types or as fallback for text
                          url = `data:${document.fileType};base64,${document.fileContent}`;
                          */
                          
                          // Open in new window
                          window.open(url, '_blank');
                        } catch (error: any) {
                          console.error("Error opening file:", error);
                          alert("Error: " + (error.message || "Could not open file in new window"));
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Window
                    </Button>
                  </div>
                </>
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
                    {`This file type (${document.fileType}) can't be previewed directly in the browser. Please download to view.`}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        // Use direct data URI which is more reliable and skips atob
                        try {
                          const url = `data:${document.fileType};base64,${document.fileContent}`;
                          window.open(url, '_blank');
                        } catch (error) {
                          console.error("Error opening in new window:", error);
                          alert("Error: Could not open file in new window. Please try the download option instead.");
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new window
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Create a download link - handle text files differently
                        try {
                          // For all file types, use data URI which is more reliable
                          const link = window.document.createElement('a');
                          link.href = `data:${document.fileType};base64,${document.fileContent}`;
                          link.download = document.fileName;
                          window.document.body.appendChild(link);
                          link.click();
                          window.document.body.removeChild(link);
                        } catch (error: any) {
                          console.error("Error downloading document:", error);
                          alert("Download error: " + (error.message || "Could not download file"));
                        }
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
        
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}