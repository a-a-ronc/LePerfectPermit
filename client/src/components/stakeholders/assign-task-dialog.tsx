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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Mail, Phone, Building } from "lucide-react";

const assignTaskSchema = z.object({
  stakeholderId: z.string().min(1, "Stakeholder is required"),
  taskType: z.string().min(1, "Task type is required"),
  description: z.string().min(1, "Task description is required"),
  documentCategory: z.string().optional(),
});

interface AssignTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

export function AssignTaskDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
}: AssignTaskDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Load project stakeholders
  const { data: stakeholders = [], isLoading: isLoadingStakeholders } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
    enabled: projectId > 0 && isOpen,
  });

  // Load user details
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Create a map of user details
  const userMap = users.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {});

  // Combine stakeholder data with user details and apply search filter
  const availableStakeholders = stakeholders
    .map((stakeholder: any) => ({
      ...stakeholder,
      user: userMap[stakeholder.userId] || {},
    }))
    .filter((stakeholder: any) => 
      searchTerm === "" || 
      stakeholder.user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stakeholder.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => {
      // Sort by most recently added (assuming higher IDs are more recent)
      return b.id - a.id;
    });

  const form = useForm<z.infer<typeof assignTaskSchema>>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      stakeholderId: "",
      taskType: "",
      description: "",
      documentCategory: "",
    },
  });

  const selectedStakeholderId = form.watch("stakeholderId");
  const selectedStakeholder = availableStakeholders.find(
    (s: any) => s.id.toString() === selectedStakeholderId
  );

  const assignTaskMutation = useMutation({
    mutationFn: async (values: z.infer<typeof assignTaskSchema>) => {
      const taskData = {
        stakeholderId: parseInt(values.stakeholderId),
        taskType: values.taskType,
        description: values.description,
        documentCategory: values.documentCategory || null,
        projectId,
        projectName,
      };

      const res = await apiRequest("POST", "/api/tasks/assign", taskData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
      form.reset();
      onClose();
      
      toast({
        title: "Task Assigned",
        description: "The task has been assigned and the stakeholder has been notified via email.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Assign Task",
        description: "There was an error assigning the task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof assignTaskSchema>) => {
    assignTaskMutation.mutate(values);
  };

  const taskTypes = [
    { value: "provide_document", label: "Provide Document" },
    { value: "review_document", label: "Review Document" },
    { value: "approve_document", label: "Approve Document" },
    { value: "update_information", label: "Update Information" },
    { value: "schedule_meeting", label: "Schedule Meeting" },
    { value: "other", label: "Other" },
  ];

  const documentCategories = [
    { value: "site_plan", label: "Site Plan" },
    { value: "facility_plan", label: "Facility Plan" },
    { value: "egress_plan", label: "Egress Plan" },
    { value: "storage_plan", label: "Storage Plan" },
    { value: "fire_protection", label: "Fire Protection" },
    { value: "special_inspection", label: "Special Inspection" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Task to Stakeholder</DialogTitle>
          <DialogDescription>
            Assign a task to a project stakeholder. They will be notified via email and in-app notification.
          </DialogDescription>
        </DialogHeader>

        {isLoadingStakeholders || isLoadingUsers ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="stakeholderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Stakeholder</FormLabel>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search stakeholders..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a stakeholder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableStakeholders.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">
                              {searchTerm ? `No stakeholders found matching "${searchTerm}"` : "No stakeholders assigned to this project"}
                            </div>
                          ) : (
                            availableStakeholders.map((stakeholder: any) => (
                              <SelectItem key={stakeholder.id} value={stakeholder.id.toString()}>
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
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display selected stakeholder details */}
              {selectedStakeholder && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Selected Stakeholder Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <div className="font-medium">{selectedStakeholder.user?.fullName}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <div className="font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedStakeholder.user?.email}
                      </div>
                    </div>
                    {selectedStakeholder.user?.defaultContactPhone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedStakeholder.user.defaultContactPhone}
                        </div>
                      </div>
                    )}
                    {selectedStakeholder.assignedCategories && selectedStakeholder.assignedCategories.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Assigned Categories:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {selectedStakeholder.assignedCategories.map((cat: string) => 
                            cat.split('_').map((word: string) => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')
                          ).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("taskType") === "provide_document" && (
                <FormField
                  control={form.control}
                  name="documentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter detailed task description..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={assignTaskMutation.isPending || availableStakeholders.length === 0}
                >
                  {assignTaskMutation.isPending ? "Assigning..." : "Assign Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}