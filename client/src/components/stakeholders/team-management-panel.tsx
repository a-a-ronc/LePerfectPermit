import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Mail, 
  Phone, 
  Building,
  UserX
} from "lucide-react";
import { AddStakeholderDialog } from "./add-stakeholder-dialog";

interface TeamManagementPanelProps {
  projectId: number;
}

export function TeamManagementPanel({ projectId }: TeamManagementPanelProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [stakeholderToDelete, setStakeholderToDelete] = useState<any>(null);

  // Load project stakeholders with user details
  const { data: stakeholders = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
    enabled: projectId > 0,
  });

  // Load user details for each stakeholder
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create a map of user details
  const userMap = users.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {});

  // Combine stakeholder data with user details
  const enrichedStakeholders = stakeholders.map((stakeholder: any) => ({
    ...stakeholder,
    user: userMap[stakeholder.userId] || {},
  }));

  const deleteStakeholderMutation = useMutation({
    mutationFn: async (stakeholderId: number) => {
      const res = await apiRequest("DELETE", `/api/stakeholders/${stakeholderId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
      setStakeholderToDelete(null);
      
      toast({
        title: "Stakeholder Removed",
        description: "The stakeholder has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Remove Stakeholder",
        description: "There was an error removing the stakeholder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDocumentCategories = (categories: string[]) => {
    if (!categories || categories.length === 0) return "No categories assigned";
    return categories.map(cat => 
      cat.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(', ');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage stakeholders assigned to this project
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Stakeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : enrichedStakeholders.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Team Members
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add stakeholders to collaborate on this project
              </p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Stakeholder
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrichedStakeholders.map((stakeholder: any) => (
                <div
                  key={stakeholder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {stakeholder.user?.fullName
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        {stakeholder.user?.fullName || 'Unknown User'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {stakeholder.user?.email || 'No email'}
                      </div>
                      {stakeholder.user?.defaultContactPhone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {stakeholder.user.defaultContactPhone}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.isArray(stakeholder.roles) ? (
                          stakeholder.roles.map((role: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {formatRole(role)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {formatRole(stakeholder.roles || 'stakeholder')}
                          </Badge>
                        )}
                      </div>
                      {stakeholder.assignedCategories && stakeholder.assignedCategories.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Building className="h-3 w-3 inline mr-1" />
                          {formatDocumentCategories(stakeholder.assignedCategories)}
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
                      <DropdownMenuItem 
                        onClick={() => setStakeholderToDelete(stakeholder)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddStakeholderDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        projectId={projectId}
      />

      <AlertDialog 
        open={!!stakeholderToDelete} 
        onOpenChange={() => setStakeholderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Stakeholder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {stakeholderToDelete?.user?.fullName} from this project? 
              This will remove their access to project documents and notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStakeholderMutation.mutate(stakeholderToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Stakeholder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}