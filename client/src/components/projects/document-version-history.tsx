import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Eye, GitCompare, Trash2, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document } from "@shared/schema";
import { 
  getDocumentStatusColor, 
  getDocumentStatusLabel,
  formatDocumentCategory 
} from "@/lib/utils/document-utils";
import { formatDateTime } from "@/lib/utils/date-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [mode, setMode] = useState<'compare' | 'delete'>('compare');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
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
      if (mode === 'compare') {
        // Only allow up to 2 selected versions for comparison
        if (selectedVersionIds.length < 2) {
          setSelectedVersionIds([...selectedVersionIds, docId]);
        }
      } else {
        // Delete mode - allow multiple selections
        setSelectedVersionIds([...selectedVersionIds, docId]);
      }
    }
  };
  
  const canCompare = selectedVersionIds.length === 2 && mode === 'compare';
  const canDelete = selectedVersionIds.length > 0 && mode === 'delete';
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const promises = documentIds.map(id => 
        apiRequest("DELETE", `/api/documents/${id}`)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents/category/${document.category}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
      
      toast({
        title: "Documents Deleted",
        description: `Successfully deleted ${selectedVersionIds.length} document version${selectedVersionIds.length > 1 ? 's' : ''}.`,
      });
      
      setSelectedVersionIds([]);
      setDeleteDialogOpen(false);
      
      // Close the version history dialog if all versions were deleted
      const remainingVersions = sortedVersions.filter(v => !selectedVersionIds.includes(v.id));
      if (remainingVersions.length === 0) {
        onClose();
      }
    },
    onError: (error: any) => {
      console.error('Delete versions error:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the selected versions. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleModeChange = (newMode: 'compare' | 'delete') => {
    setMode(newMode);
    setSelectedVersionIds([]);
  };
  
  const handleDeleteSelected = () => {
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    deleteMutation.mutate(selectedVersionIds);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Version History</DialogTitle>
            <DialogDescription>
              {formatDocumentCategory(document.category)} - Manage document versions
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={mode} onValueChange={(value) => handleModeChange(value as 'compare' | 'delete')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Versions
              </TabsTrigger>
              <TabsTrigger value="delete" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Versions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="compare" className="flex-grow overflow-auto p-1">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Select up to 2 versions to compare their differences.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="delete" className="flex-grow overflow-auto p-1">
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Select one or more versions to permanently delete. This action cannot be undone.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
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
                              disabled={mode === 'compare' && selectedVersionIds.length >= 2 && !isSelected}
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
          
          <DialogFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              {selectedVersionIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedVersionIds.length} selected
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {canCompare && (
                <Button>
                  Compare Selected Versions
                </Button>
              )}
              {canDelete && (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedVersionIds.length})
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedVersionIds.length} document version{selectedVersionIds.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-700">
                The following versions will be permanently deleted:
              </p>
              <ul className="mt-2 text-sm text-red-600">
                {selectedVersionIds.map(id => {
                  const version = sortedVersions.find(v => v.id === id);
                  return version ? (
                    <li key={id} className="flex items-center gap-2">
                      • Version {version.version} - {version.fileName} 
                      <Badge variant="outline" className="text-xs">
                        {formatDateTime(version.uploadedAt)}
                      </Badge>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}