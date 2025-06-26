import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import { TaskType } from "@shared/schema";
import { UserPlus, FileText, Send } from "lucide-react";

interface StakeholderAssignmentWidgetProps {
  projectId: number;
  documentCategory: string;
  onAssignmentComplete?: () => void;
}

export function StakeholderAssignmentWidget({ 
  projectId, 
  documentCategory,
  onAssignmentComplete 
}: StakeholderAssignmentWidgetProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('');
  const [description, setDescription] = useState('');

  // Fetch stakeholders for this project
  const { data: stakeholders = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/stakeholders/${data.stakeholderId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          documentCategory,
          taskType: data.taskType,
          description: data.description,
          status: 'pending'
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({
        title: "Task Assigned",
        description: "Stakeholder has been notified of their new task.",
      });
      setDialogOpen(false);
      setSelectedStakeholder('');
      setTaskType('');
      setDescription('');
      onAssignmentComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTask = () => {
    if (!selectedStakeholder || !taskType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      stakeholderId: parseInt(selectedStakeholder),
      taskType,
      description: description.trim(),
    });
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case TaskType.PROVIDE_DOCUMENT: return 'Provide Document';
      case TaskType.REVIEW_DOCUMENT: return 'Review Document';
      case TaskType.APPROVE_DOCUMENT: return 'Approve Document';
      case TaskType.COLLABORATE: return 'Collaborate';
      default: return type;
    }
  };

  const getTaskTypeDescription = (type: string) => {
    switch (type) {
      case TaskType.PROVIDE_DOCUMENT: 
        return `Please provide the required document for ${formatDocumentCategory(documentCategory)}.`;
      case TaskType.REVIEW_DOCUMENT:
        return `Please review the submitted ${formatDocumentCategory(documentCategory)} document and provide feedback.`;
      case TaskType.APPROVE_DOCUMENT:
        return `Please review and approve the ${formatDocumentCategory(documentCategory)} document.`;
      case TaskType.COLLABORATE:
        return `Please collaborate on the ${formatDocumentCategory(documentCategory)} requirements.`;
      default:
        return '';
    }
  };

  // Filter stakeholders that have this category assigned or have relevant roles
  const relevantStakeholders = stakeholders.filter((stakeholder: any) => 
    stakeholder.assignedCategories?.includes(documentCategory) ||
    stakeholder.roles?.some((role: string) => 
      ['reviewer', 'approver', 'engineer', 'architect'].includes(role)
    )
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <UserPlus className="h-3 w-3 mr-1" />
          Assign to Stakeholder
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assign Task: {formatDocumentCategory(documentCategory)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="stakeholder">Select Stakeholder</Label>
            <div className="space-y-2 mt-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stakeholders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Custom dropdown */}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {selectedStakeholder && relevantStakeholders.find(s => s.id.toString() === selectedStakeholder) ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {relevantStakeholders.find(s => s.id.toString() === selectedStakeholder)?.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{relevantStakeholders.find(s => s.id.toString() === selectedStakeholder)?.user?.fullName || 'Unknown User'}</span>
                    </div>
                  ) : (
                    "Choose a stakeholder"
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
                
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {relevantStakeholders.length === 0 ? (
                      <div className="p-3 space-y-2">
                        <div className="text-sm text-gray-500">
                          {searchTerm ? `No stakeholders found matching "${searchTerm}"` : 
                           stakeholders?.length === 0 ? "No stakeholders assigned to this project" : 
                           "Start typing to search stakeholders"}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setShowCreateDialog(true);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Stakeholder
                        </Button>
                      </div>
                    ) : (
                      <>
                        {relevantStakeholders.map((stakeholder: any) => (
                          <div
                            key={stakeholder.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setSelectedStakeholder(stakeholder.id.toString());
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {stakeholder.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{stakeholder.user?.fullName || 'Unknown User'}</div>
                                <div className="text-xs text-gray-500">{stakeholder.user?.email}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setShowCreateDialog(true);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Stakeholder
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="taskType">Task Type</Label>
            <Select value={taskType} onValueChange={(value) => {
              setTaskType(value);
              setDescription(getTaskTypeDescription(value));
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getTaskTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Task Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the stakeholder needs to do..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignTask}
              disabled={createTaskMutation.isPending || !selectedStakeholder || !taskType || !description.trim()}
            >
              {createTaskMutation.isPending ? (
                "Assigning..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Assign Task
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}