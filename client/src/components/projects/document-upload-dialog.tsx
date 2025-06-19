import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/ui/file-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DocumentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  category?: string; // Optional pre-selected category
}

export function DocumentUploadDialog({ isOpen, onClose, projectId, category }: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dialogWidth, setDialogWidth] = useState("max-w-md");
  
  const uploadMutation = useMutation({
    mutationFn: async ({ file, base64, category }: { file: File, base64: string, category: string }) => {
      setIsUploading(true);
      const res = await apiRequest("POST", `/api/projects/${projectId}/documents`, {
        projectId,
        category,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileContent: base64,
        status: "pending_review",
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
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully and is pending review.",
      });
      
      // Force page reload to ensure everything is up-to-date
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay to allow toast to be visible
    },
    onError: (error: Error) => {
      console.error('Document upload error:', error);
      let errorMessage = "There was an error uploading your document. Please try again.";
      
      if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = "File size too large. Please use a file smaller than 15MB.";
      } else if (error.message.includes('408') || error.message.includes('timeout')) {
        errorMessage = "Upload timeout. Please try with a smaller file or check your connection.";
      } else if (error.message.includes('aborted')) {
        errorMessage = "Upload was interrupted. Please try again with a smaller file.";
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });
  
  // Calculate dialog width based on longest filename
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setDialogWidth("max-w-md");
      return;
    }

    const longestFilename = selectedFiles.reduce((longest, file) => 
      file.name.length > longest.length ? file.name : longest, ""
    );

    // Estimate width needed based on filename length
    // Roughly 8px per character plus padding
    const estimatedWidth = Math.max(400, Math.min(800, longestFilename.length * 8 + 200));
    
    if (estimatedWidth > 700) {
      setDialogWidth("max-w-4xl");
    } else if (estimatedWidth > 600) {
      setDialogWidth("max-w-3xl");
    } else if (estimatedWidth > 500) {
      setDialogWidth("max-w-2xl");
    } else if (estimatedWidth > 400) {
      setDialogWidth("max-w-xl");
    } else {
      setDialogWidth("max-w-lg");
    }
  }, [selectedFiles]);

  const handleFileSelect = (file: File, base64: string, category: string) => {
    uploadMutation.mutate({ file, base64, category });
  };

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  // Determine the dialog title based on whether a category is selected
  const dialogTitle = category 
    ? `Upload ${formatDocumentCategory(category)} Documents` 
    : "Upload Documents";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${dialogWidth} max-h-[80vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {category 
              ? `Select one or more documents to upload for the ${formatDocumentCategory(category)} category. All documents will be reviewed by a permit specialist.`
              : "Select one or more documents to upload for this project. You can upload multiple files at once in the same category. All documents will be reviewed by a permit specialist."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <FileUpload 
            onFileSelect={handleFileSelect}
            onFilesChange={handleFilesChange}
            acceptedFileTypes=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            disabled={isUploading || uploadMutation.isPending}
            maxSizeMB={15} // Reduced to prevent timeout issues
            category={category} // Pass the pre-selected category
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
