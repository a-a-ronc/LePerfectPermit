import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { UserPlus, FileText, Send, Search, Plus, ChevronDown } from "lucide-react";
import { CreateStakeholderDialog } from "./create-stakeholder-dialog";
import { AddStakeholderDialog } from "./add-stakeholder-dialog";

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch stakeholders for this project
  const { data: stakeholders = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
  });

  // Load all users for creating stakeholder dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create user map for easy lookup
  const userMap = (users as any[]).reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {});

  // Combine stakeholder data with user details and apply search filter
  const relevantStakeholders = (stakeholders as any[])
    .map((stakeholder: any) => ({
      ...stakeholder,
      user: userMap[stakeholder.userId] || {},
    }))
    .filter((stakeholder: any) => {
      // Apply search filter
      if (searchTerm.trim()) {
        const fullName = stakeholder.user.fullName?.toLowerCase() || '';
        const email = stakeholder.user.email?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        
        if (!fullName.includes(searchLower) && !email.includes(searchLower)) {
          return false;
        }
      }

      // Apply role filter if needed - for now, include all stakeholders
      return true;
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
                           (stakeholders as any[])?.length === 0 ? "No stakeholders assigned to this project" : 
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

        {/* Create New Stakeholder Dialog */}
        <CreateStakeholderDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onStakeholderCreated={(user) => {
            setShowCreateDialog(false);
            setShowAddDialog(true);
          }}
        />

        {/* Add Stakeholder to Project Dialog */}
        <AddStakeholderDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          projectId={projectId}
        />
      </DialogContent>
    </Dialog>
  );
}