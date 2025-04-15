import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/ui/file-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
}

export function DocumentUploadDialog({ isOpen, onClose, projectId }: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
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
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading your document. Please try again or reduce the file size.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });
  
  const handleFileSelect = (file: File, base64: string, category: string) => {
    uploadMutation.mutate({ file, base64, category });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Select one or more documents to upload for this project. You can upload multiple files at once in the same category. All documents will be reviewed by a permit specialist.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <FileUpload 
            onFileSelect={handleFileSelect}
            acceptedFileTypes=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            disabled={isUploading || uploadMutation.isPending}
            maxSizeMB={40} // Increased file size limit to 40MB
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
