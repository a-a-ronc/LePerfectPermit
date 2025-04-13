import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Document } from "@shared/schema";
import { formatDateTime } from "@/lib/utils/date-utils";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowDownUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import { getDocumentStatusColor, getDocumentStatusLabel } from "@/lib/utils/document-utils";

interface DocumentVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  projectId: number;
}

export function DocumentVersionHistory({ 
  isOpen, 
  onClose, 
  document, 
  projectId 
}: DocumentVersionHistoryProps) {
  const [selectedVersionIds, setSelectedVersionIds] = useState<number[]>([]);
  
  // Fetch all versions of this document
  const { data: allVersions = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/projects/${projectId}/documents/category/${document.category}`],
    enabled: isOpen,
  });
  
  // Sort versions in descending order (newest first)
  const sortedVersions = [...allVersions].sort((a, b) => b.version - a.version);
  
  const handleVersionSelect = (docId: number) => {
    if (selectedVersionIds.includes(docId)) {
      setSelectedVersionIds(selectedVersionIds.filter(id => id !== docId));
    } else {
      // Only allow up to 2 selected versions for comparison
      if (selectedVersionIds.length < 2) {
        setSelectedVersionIds([...selectedVersionIds, docId]);
      }
    }
  };
  
  const canCompare = selectedVersionIds.length === 2;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Version History</DialogTitle>
          <DialogDescription>
            {formatDocumentCategory(document.category)} - View all versions or select two versions to compare
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-auto p-1">
          {isLoading ? (
            <div className="py-8 text-center">
              <p>Loading document versions...</p>
            </div>
          ) : sortedVersions.length === 0 ? (
            <div className="py-8 text-center">
              <p>No versions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedVersions.map((ver) => {
                const isSelected = selectedVersionIds.includes(ver.id);
                const { bg, text } = getDocumentStatusColor(ver.status);
                const isCurrentVersion = ver.id === document.id;
                
                return (
                  <div 
                    key={ver.id} 
                    className={`p-4 border rounded-lg ${isSelected ? 'bg-primary/5 border-primary' : 'bg-card'} ${isCurrentVersion ? 'ring-2 ring-primary/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleVersionSelect(ver.id)}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <FileText className="h-5 w-5 text-gray-500 mr-2" />
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{ver.fileName}</span>
                            <Badge variant="outline" className="ml-2">v{ver.version}</Badge>
                            {isCurrentVersion && (
                              <Badge className="ml-2">Current</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <span>Uploaded {formatDateTime(ver.uploadedAt)}</span>
                            <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
                              {getDocumentStatusLabel(ver.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    {ver.comments && (
                      <div className="mt-3 bg-muted/30 p-2 rounded text-sm">
                        <p className="font-medium text-xs text-gray-500 mb-1">Reviewer Comments:</p>
                        <p>{ver.comments}</p>
                      </div>
                    )}
                    
                    {ver.reviewedById && (
                      <div className="mt-2 text-xs text-gray-500">
                        {ver.status === 'approved' ? (
                          <div className="flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1" />
                            <span>Approved {formatDateTime(ver.reviewedAt)}</span>
                          </div>
                        ) : ver.status === 'rejected' ? (
                          <div className="flex items-center">
                            <XCircle className="h-3.5 w-3.5 text-red-500 mr-1" />
                            <span>Rejected {formatDateTime(ver.reviewedAt)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 text-amber-500 mr-1" />
                            <span>Reviewed {formatDateTime(ver.reviewedAt)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedVersionIds.length > 0 
              ? `${selectedVersionIds.length} version${selectedVersionIds.length > 1 ? 's' : ''} selected` 
              : 'Select versions to compare'}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              disabled={!canCompare} 
              onClick={() => {
                // Handle comparison logic - for now just log the IDs
                console.log("Compare versions:", selectedVersionIds);
              }}
            >
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Compare Versions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// This will be needed in Tailwind config
import { Eye } from "lucide-react";