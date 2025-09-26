import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StakeholderRole, DocumentCategory, TaskType } from "@shared/schema";
import { formatDocumentCategory } from "@/lib/utils/document-utils";
import { User, Plus, X, UserCheck, FileText, CheckCircle } from "lucide-react";

// Form schemas
const stakeholderFormSchema = z.object({
  userId: z.number().min(1, "Please select a user"),
  roles: z.array(z.string()).min(1, "Please select at least one role"),
  assignedCategories: z.array(z.string()).optional().default([]),
});

const taskFormSchema = z.object({
  documentCategory: z.string().min(1, "Please select a document category"),
  taskType: z.string().min(1, "Please select a task type"),
  description: z.string().min(1, "Please provide a description"),
  dueDate: z.string().optional(),
});

type StakeholderFormValues = z.infer<typeof stakeholderFormSchema>;
type TaskFormValues = z.infer<typeof taskFormSchema>;

interface EnhancedStakeholderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  editingStakeholder?: any;
}

export function EnhancedStakeholderDialog({ 
  isOpen, 
  onClose, 
  projectId,
  editingStakeholder 
}: EnhancedStakeholderDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'categories' | 'tasks'>('basic');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskFormValues[]>([]);

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Form setup
  const form = useForm<StakeholderFormValues>({
    resolver: zodResolver(stakeholderFormSchema),
    defaultValues: {
      userId: editingStakeholder?.userId || 0,
      roles: editingStakeholder?.roles || [],
      assignedCategories: editingStakeholder?.assignedCategories || [],
    }
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      documentCategory: '',
      taskType: '',
      description: '',
      dueDate: '',
    }
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingStakeholder) {
        form.reset({
          userId: editingStakeholder.userId,
          roles: editingStakeholder.roles || [],
          assignedCategories: editingStakeholder.assignedCategories || [],
        });
        setSelectedCategories(editingStakeholder.assignedCategories || []);
      } else {
        form.reset({
          userId: 0,
          roles: [],
          assignedCategories: [],
        });
        setSelectedCategories([]);
        setPendingTasks([]);
      }
    }
  }, [isOpen, editingStakeholder, form]);

  // Create/update stakeholder mutation
  const stakeholderMutation = useMutation({
    mutationFn: async (data: StakeholderFormValues) => {
      const payload = {
        ...data,
        assignedCategories: selectedCategories,
      };

      if (editingStakeholder) {
        return await apiRequest(`/api/stakeholders/${editingStakeholder.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest(`/api/projects/${projectId}/stakeholders`, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: async (stakeholder) => {
      // Create tasks for assigned categories
      for (const task of pendingTasks) {
        try {
          await apiRequest(`/api/stakeholders/${stakeholder.id}/tasks`, {
            method: 'POST',
            body: JSON.stringify(task),
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error creating task:', error);
        }
      }

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      
      toast({
        title: editingStakeholder ? "Stakeholder Updated" : "Stakeholder Added",
        description: editingStakeholder 
          ? "Stakeholder has been updated successfully."
          : "New stakeholder has been added to the project.",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save stakeholder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StakeholderFormValues) => {
    stakeholderMutation.mutate(data);
  };

  const addTask = (task: TaskFormValues) => {
    setPendingTasks(prev => [...prev, task]);
    taskForm.reset();
  };

  const removeTask = (index: number) => {
    setPendingTasks(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const availableRoles = Object.values(StakeholderRole);
  const availableCategories = Object.values(DocumentCategory);
  const availableTaskTypes = Object.values(TaskType);

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case TaskType.PROVIDE_DOCUMENT: return 'Provide Document';
      case TaskType.REVIEW_DOCUMENT: return 'Review Document';
      case TaskType.APPROVE_DOCUMENT: return 'Approve Document';
      case TaskType.COLLABORATE: return 'Collaborate';
      default: return type;
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'basic' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Info
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'categories' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Categories ({selectedCategories.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'tasks' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Tasks ({pendingTasks.length})
            </div>
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select User</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        disabled={!!editingStakeholder}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user to add as stakeholder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{user.fullName}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel>Stakeholder Roles</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {availableRoles.map((role) => (
                          <FormField
                            key={role}
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(role)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, role])
                                        : field.onChange(field.value?.filter((value) => value !== role))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {getRoleLabel(role)}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Document Categories Tab */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Assigned Document Categories</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select which document categories this stakeholder will be responsible for.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {availableCategories.map((category) => (
                    <div
                      key={category}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategories.includes(category)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border hover:border-gray-300'
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{formatDocumentCategory(category)}</div>
                          <div className="text-sm text-muted-foreground">
                            Document category: {category}
                          </div>
                        </div>
                        <Checkbox 
                          checked={selectedCategories.includes(category)}
                          onChange={() => {}} // Handled by parent div onClick
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCategories.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Selected Categories:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCategories.map((category) => (
                        <Badge key={category} variant="secondary" className="flex items-center gap-1">
                          {formatDocumentCategory(category)}
                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="ml-1 text-muted-foreground hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Stakeholder Tasks</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create specific tasks and objectives for this stakeholder.
                  </p>
                </div>

                {/* Add New Task Form */}
                <div className="p-4 border rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="h-4 w-4" />
                    <Label className="font-medium">Add New Task</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="documentCategory" className="text-sm">Document Category</Label>
                      <Select onValueChange={(value) => taskForm.setValue('documentCategory', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {formatDocumentCategory(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="taskType" className="text-sm">Task Type</Label>
                      <Select onValueChange={(value) => taskForm.setValue('taskType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTaskTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getTaskTypeLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="description" className="text-sm">Task Description</Label>
                    <Textarea
                      placeholder="Describe what the stakeholder needs to do..."
                      className="mt-1"
                      onChange={(e) => taskForm.setValue('description', e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="dueDate" className="text-sm">Due Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      className="mt-1"
                      onChange={(e) => taskForm.setValue('dueDate', e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      const values = taskForm.getValues();
                      if (values.documentCategory && values.taskType && values.description) {
                        addTask(values);
                      }
                    }}
                    className="mt-4"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </div>

                {/* Pending Tasks List */}
                {pendingTasks.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Pending Tasks ({pendingTasks.length})</Label>
                    <div className="space-y-3 mt-2">
                      {pendingTasks.map((task, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-card">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{formatDocumentCategory(task.documentCategory)}</Badge>
                                <Badge variant="secondary">{getTaskTypeLabel(task.taskType)}</Badge>
                              </div>
                              <p className="text-sm text-gray-700">{task.description}</p>
                              {task.dueDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={stakeholderMutation.isPending}
          >
            {stakeholderMutation.isPending 
              ? (editingStakeholder ? 'Updating...' : 'Adding...') 
              : (editingStakeholder ? 'Update Stakeholder' : 'Add Stakeholder')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}