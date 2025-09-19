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
import { Search, User, Mail, Phone, Building, ChevronDown, Plus } from "lucide-react";
import { CreateStakeholderDialog } from "./create-stakeholder-dialog";
import { AddStakeholderDialog } from "./add-stakeholder-dialog";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load ALL users who can be stakeholders
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
    staleTime: 0,
    gcTime: 0,
  });

  // Load project details to get client company
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isOpen,
  });

  // Enhanced filtering: specialists OR stakeholders from the project's client company
  const availableStakeholders = (users as any[])
    .filter((user: any) => {
      // Always include specialists - they can work on any project
      if (user.role === "specialist") {
        return true;
      }
      
      // For stakeholders, only include those from the same company as the project
      if (user.role === "stakeholder" && project?.clientName && user.company) {
        return user.company.toLowerCase() === project.clientName.toLowerCase();
      }
      
      return false;
    })
    .filter((user: any) => 
      searchTerm === "" || 
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .map((user: any) => ({
      id: user.id,
      userId: user.id,
      user: user,
    }))
    .sort((a: any, b: any) => {
      // Sort specialists first, then by name
      if (a.user.role === "specialist" && b.user.role !== "specialist") return -1;
      if (a.user.role !== "specialist" && b.user.role === "specialist") return 1;
      return (a.user.fullName || '').localeCompare(b.user.fullName || '');
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
    (s: any) => s.userId.toString() === selectedStakeholderId
  );

  const assignTaskMutation = useMutation({
    mutationFn: async (values: z.infer<typeof assignTaskSchema>) => {
      const taskData = {
        userId: parseInt(values.stakeholderId), // Send user ID to server for lookup
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
      setSearchTerm("");
      setIsDropdownOpen(false);
      onClose();
      
      toast({
        title: "Task Assigned",
        description: "The task has been assigned and the stakeholder has been notified.",
      });
    },
    onError: (error: any) => {
      console.error("Task assignment error:", error);
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

        {isLoadingUsers ? (
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
                      
                      {/* Custom dropdown instead of Select */}
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                          {field.value && availableStakeholders.find(s => s.id.toString() === field.value) ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {availableStakeholders.find(s => s.id.toString() === field.value)?.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{availableStakeholders.find(s => s.id.toString() === field.value)?.user?.fullName || 'Unknown User'}</span>
                            </div>
                          ) : (
                            "Choose a stakeholder"
                          )}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {availableStakeholders.length === 0 ? (
                              <div className="p-3 space-y-2">
                                <div className="text-sm text-gray-500">
                                  {searchTerm ? `No stakeholders found matching "${searchTerm}"` : 
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
                                {availableStakeholders.map((stakeholder: any) => (
                                  <div
                                    key={stakeholder.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      field.onChange(stakeholder.id.toString());
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
                    <div>
                      <span className="text-muted-foreground">Role:</span>
                      <div className="font-medium flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {selectedStakeholder.user?.role?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                      </div>
                    </div>
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