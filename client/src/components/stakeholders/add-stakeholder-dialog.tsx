import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DocumentCategory } from "@shared/schema";
import { CreateStakeholderDialog } from "./create-stakeholder-dialog";
import { Search, Plus } from "lucide-react";

// Define form schema
const formSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: z.string().min(1, "Role is required"),
  assignedCategories: z.array(z.string()).optional(),
});

interface AddStakeholderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

export function AddStakeholderDialog({
  isOpen,
  onClose,
  projectId,
}: AddStakeholderDialogProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Load users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });
  
  // Filter stakeholder users
  const stakeholderUsers = users.filter(user => user.role === "stakeholder");
  
  // Load existing project stakeholders to avoid duplicates
  const { data: existingStakeholders = [], isLoading: isLoadingStakeholders } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
    enabled: isOpen && projectId > 0,
  });
  
  // Get IDs of users already assigned to this project
  const existingUserIds = existingStakeholders.map((s: any) => s.userId.toString());
  
  // Filter out users already assigned to project and apply search filter
  const availableUsers = stakeholderUsers
    .filter(user => !existingUserIds.includes(user.id.toString()))
    .filter(user => 
      searchTerm === "" || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      role: "project_manager",
      assignedCategories: [],
    },
  });
  
  // Add stakeholder mutation
  const addStakeholderMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const formattedValues = {
        ...values,
        userId: parseInt(values.userId),
        assignedCategories: values.assignedCategories || [],
        projectId,
      };
      
      const res = await apiRequest("POST", `/api/projects/${projectId}/stakeholders`, formattedValues);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      form.reset();
      onClose();
      toast({
        title: "Stakeholder Added",
        description: "The stakeholder has been added to the project successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Add Stakeholder",
        description: "There was an error adding the stakeholder. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    addStakeholderMutation.mutate(values);
  };

  const handleCreateNewStakeholder = () => {
    setShowCreateDialog(true);
  };

  const handleStakeholderCreated = (newUser: any) => {
    // Refresh users list and pre-select the new user
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    setSelectedUser(newUser.id.toString());
    form.setValue("userId", newUser.id.toString());
    setShowCreateDialog(false);
  };
  
  const documentCategories = [
    { id: DocumentCategory.SITE_PLAN, label: "Site Plan" },
    { id: DocumentCategory.FACILITY_PLAN, label: "Facility Plan" },
    { id: DocumentCategory.EGRESS_PLAN, label: "Egress Plan" },
    { id: DocumentCategory.STRUCTURAL_PLANS, label: "Structural Plans" },
    { id: DocumentCategory.COMMODITIES, label: "Commodities Form" },
    { id: DocumentCategory.FIRE_PROTECTION, label: "Fire Protection" },
    { id: DocumentCategory.SPECIAL_INSPECTION, label: "Special Inspection" },
  ];
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Stakeholder</DialogTitle>
            <DialogDescription>
            Add a stakeholder to this project and assign document categories they should provide.
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingUsers || isLoadingStakeholders ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stakeholder</FormLabel>
                    {availableUsers.length === 0 ? (
                      <div className="text-sm text-gray-500 p-2 border rounded-md">
                        All stakeholders are already assigned to this project.
                      </div>
                    ) : (
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedUser(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a stakeholder" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarFallback className="text-xs">
                                      {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.fullName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="facility_manager">Facility Manager</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="architect">Architect</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="client_representative">Client Representative</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedCategories"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Assigned Document Categories</FormLabel>
                      <div className="text-sm text-gray-500">
                        Select document categories this stakeholder is responsible for providing.
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {documentCategories.map((category) => (
                        <FormField
                          key={category.id}
                          control={form.control}
                          name="assignedCategories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={category.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(category.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, category.id])
                                        : field.onChange(
                                            currentValue.filter((value) => value !== category.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {category.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addStakeholderMutation.isPending || availableUsers.length === 0}
                >
                  {addStakeholderMutation.isPending ? "Adding..." : "Add Stakeholder"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
        </DialogContent>
      </Dialog>

      <CreateStakeholderDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onStakeholderCreated={handleStakeholderCreated}
      />
    </>
  );
}
