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
            <Select value={selectedStakeholder} onValueChange={setSelectedStakeholder}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a stakeholder" />
              </SelectTrigger>
              <SelectContent>
                {relevantStakeholders.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    No relevant stakeholders found. Add stakeholders with appropriate roles first.
                  </div>
                ) : (
                  relevantStakeholders.map((stakeholder: any) => (
                    <SelectItem key={stakeholder.id} value={stakeholder.id.toString()}>
                      <div>
                        <div className="font-medium">{stakeholder.user?.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {stakeholder.roles?.join(', ') || 'Stakeholder'}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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