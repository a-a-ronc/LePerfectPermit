import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import { EnhancedStakeholderDialog } from "./enhanced-stakeholder-dialog";
import { 
  Users, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash, 
  Mail,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

interface StakeholderManagementPanelProps {
  projectId: number;
}

export function StakeholderManagementPanel({ projectId }: StakeholderManagementPanelProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<any>(null);

  // Fetch stakeholders
  const { data: stakeholders = [], isLoading: stakeholdersLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
  });

  // Fetch stakeholder tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
  });

  // Delete stakeholder mutation
  const deleteStakeholderMutation = useMutation({
    mutationFn: async (stakeholderId: number) => {
      return await apiRequest(`/api/stakeholders/${stakeholderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({
        title: "Stakeholder Removed",
        description: "Stakeholder has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove stakeholder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (stakeholder: any) => {
    setEditingStakeholder(stakeholder);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStakeholder(null);
    setDialogOpen(true);
  };

  const handleDeleteStakeholder = (stakeholderId: number) => {
    if (confirm("Are you sure you want to remove this stakeholder from the project?")) {
      deleteStakeholderMutation.mutate(stakeholderId);
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getTasksForStakeholder = (stakeholderId: number) => {
    return tasks.filter((task: any) => task.stakeholderId === stakeholderId);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800';
      case 'pending': return 'bg-muted text-gray-800';
      default: return 'bg-muted text-gray-800';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in_progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  if (stakeholdersLoading || tasksLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stakeholder Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Stakeholder Management ({stakeholders.length})
            </CardTitle>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Stakeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stakeholders.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stakeholders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add stakeholders to assign document responsibilities and manage project collaboration.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Stakeholder
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stakeholders.map((stakeholder: any) => {
                const stakeholderTasks = getTasksForStakeholder(stakeholder.id);
                const completedTasks = stakeholderTasks.filter((task: any) => task.status === 'completed');
                
                return (
                  <div key={stakeholder.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 dark:primary/20 text-primary">
                            {stakeholder.user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{stakeholder.user?.fullName || 'Unknown User'}</h4>
                            {stakeholder.user?.email && (
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{stakeholder.user?.email}</p>
                          
                          {/* Roles */}
                          {stakeholder.roles && stakeholder.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {stakeholder.roles.map((role: string) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Assigned Categories */}
                          {stakeholder.assignedCategories && stakeholder.assignedCategories.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs text-muted-foreground mb-1">Assigned Categories:</div>
                              <div className="flex flex-wrap gap-1">
                                {stakeholder.assignedCategories.map((category: string) => (
                                  <Badge key={category} variant="outline" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {formatDocumentCategory(category)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Task Progress */}
                          {stakeholderTasks.length > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <CheckCircle className="h-3 w-3" />
                                Task Progress: {completedTasks.length}/{stakeholderTasks.length} completed
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {stakeholderTasks.slice(0, 3).map((task: any) => (
                                  <Badge 
                                    key={task.id} 
                                    className={`text-xs ${getTaskStatusColor(task.status)}`}
                                  >
                                    {getTaskStatusIcon(task.status)}
                                    <span className="ml-1">{formatDocumentCategory(task.documentCategory)}</span>
                                  </Badge>
                                ))}
                                {stakeholderTasks.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{stakeholderTasks.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(stakeholder)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Stakeholder
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteStakeholder(stakeholder.id)}
                            className="text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Remove from Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EnhancedStakeholderDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingStakeholder(null);
        }}
        projectId={projectId}
        editingStakeholder={editingStakeholder}
      />
    </>
  );
}