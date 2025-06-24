import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createStakeholderSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
});

interface CreateStakeholderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStakeholderCreated: (stakeholder: any) => void;
}

export function CreateStakeholderDialog({
  isOpen,
  onClose,
  onStakeholderCreated,
}: CreateStakeholderDialogProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createStakeholderSchema>>({
    resolver: zodResolver(createStakeholderSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      company: "",
      role: "stakeholder",
    },
  });

  const createStakeholderMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createStakeholderSchema>) => {
      // Create user account for the stakeholder
      const userData = {
        username: values.email.split('@')[0] + '_' + Date.now(), // Generate unique username
        password: 'TempPass123!', // Temporary password - they should reset it
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        role: values.role, // Use the selected role instead of hardcoded 'stakeholder'
        defaultContactEmail: values.email,
        defaultContactPhone: values.phoneNumber,
      };

      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user) => {
      // Force a fresh fetch of users
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      
      form.reset();
      onStakeholderCreated(user);
      onClose();
      
      toast({
        title: "Stakeholder Created",
        description: `${user.fullName} has been created and can now be assigned to projects.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Stakeholder",
        description: error.message || "There was an error creating the stakeholder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof createStakeholderSchema>) => {
    createStakeholderMutation.mutate(values);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Stakeholder</DialogTitle>
          <DialogDescription>
            Enter the details for the new stakeholder. They will receive login credentials via email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.smith@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Name" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stakeholder">Stakeholder</SelectItem>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="architect">Architect</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStakeholderMutation.isPending}>
                {createStakeholderMutation.isPending ? "Creating..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}