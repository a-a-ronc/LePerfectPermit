import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { 
  Plus, 
  Search,
  Filter,
  Trash2,
  MoreVertical
} from "lucide-react";
import { formatDate, formatDeadline } from "@/lib/utils/date-utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";
import { calculateProjectDocumentProgress } from "@/lib/utils/document-utils";
import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

// Create a custom form schema specifically for the client-side form
const clientFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  facilityAddress: z.string().min(1, "Facility address is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  jurisdictionAddress: z.string().optional(),
  clientName: z.string().min(1, "Customer name is required"),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  zipCode: z.string().optional(),
  status: z.string().default("not_started"),
  deadline: z.string().optional(),
});

// Define a more specific type for our form values
type ProjectFormValues = z.infer<typeof clientFormSchema>;

type ProjectRow = {
  id: number;
  name: string;
  permitNumber: string;
  location: string;
  status: string;
  documentsProgress: number;
  deadline: string;
  actions: string;
  createdBy: number;
};

export default function ProjectPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    
    fetchUser();
  }, []);

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  // Load documents for projects to calculate progress
  const { data: documentsByProject = {}, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/projects/documents"],
    queryFn: async () => {
      const projectDocuments: Record<number, any[]> = {};
      
      // For each project, fetch its documents
      for (const project of projects as any[]) {
        const res = await fetch(`/api/projects/${project.id}/documents`, {
          credentials: "include",
        });
        
        if (res.ok) {
          const documents = await res.json();
          projectDocuments[project.id] = documents;
        }
      }
      
      return projectDocuments;
    },
    enabled: (projects as any[]).length > 0,
  });
  
  const isLoading = isLoadingProjects || isLoadingDocuments;
  
  // Form for creating new project
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      facilityAddress: "",
      jurisdiction: "",
      clientName: "",
      contactEmail: "",
      contactPhone: "",
      zipCode: "",
      status: "not_started",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
  });
  
  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const formattedData = {
        ...data,
        zipCode: data.zipCode || null,
        jurisdictionAddress: data.jurisdictionAddress || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
      };
      
      console.log("Submitting project data:", formattedData);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "New project has been successfully created.",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Failed to create project",
        description: "There was an error creating the project. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Prepare table data
  const projectsTableData: ProjectRow[] = (projects as any[]).map((project: any) => {
    const documents = documentsByProject[project.id] || [];
    const progress = calculateProjectDocumentProgress(documents);
    
    return {
      id: project.id,
      name: project.name,
      permitNumber: project.permitNumber || "N/A",
      location: `${project.facilityAddress.split(',')[0]}, ${project.jurisdiction}`,
      status: project.status,
      documentsProgress: progress,
      deadline: project.deadline,
      actions: project.id.toString(),
      createdBy: project.createdById
    };
  });
  
  const columns: ColumnDef<ProjectRow>[] = [
    {
      accessorKey: "name",
      header: "Project",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">Permit #{row.original.permitNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.location}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const { bg, text } = getProjectStatusColor(status);
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
            {getProjectStatusLabel(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "documentsProgress",
      header: "Documents",
      cell: ({ row }) => {
        const progress = row.original.documentsProgress;
        return (
          <div className="flex items-center">
            <span className="mr-2">{progress}%</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "deadline",
      header: "Deadline",
      cell: ({ row }) => {
        const deadline = row.original.deadline;
        if (!deadline) return <span className="text-gray-500">No deadline</span>;
        
        const { text, isUrgent } = formatDeadline(deadline);
        return (
          <div className={isUrgent ? "text-red-600 font-medium" : "text-gray-600"}>
            {text}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original;
        const canDelete = user && (user.role === 'specialist' || project.createdBy === user.id);
        
        return (
          <div className="flex items-center gap-2">
            <Link href={`/project/${project.id}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View
              </Button>
            </Link>
            
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{project.name}"? This action cannot be undone and will permanently remove all project data, documents, and stakeholder assignments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deleteProjectMutation.isPending}
                        >
                          {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-grow overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="bg-white p-4 shadow-sm flex items-center justify-between">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link href="/">
                  <div className="text-gray-500 hover:text-gray-700 cursor-pointer">Dashboard</div>
                </Link>
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-2 text-gray-500">Projects</span>
              </li>
            </ol>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="p-6 overflow-auto h-[calc(100vh-64px)]">
          <div className="mb-6 flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-secondary">Projects</h1>
              <p className="text-gray-500">Manage all your high-piled storage permit projects.</p>
            </div>
            
            {user?.role === "specialist" && (
              <>
                <Button 
                  className="mt-2 md:mt-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("New Project button clicked");
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
                
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Purple Innovation - West Valley" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Purple Innovation" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="facilityAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 6862 W SR-201 N Frontage Road" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="jurisdiction"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City/Jurisdiction *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., West Valley City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 84044" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="jurisdictionAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Building Department Address</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 6862 W SR-201 N Frontage Road" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Contact Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="e.g., john@company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Contact Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="e.g., (801) 555-1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Deadline</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full">
                        Create Project
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
                </Dialog>
              </>
            )}
          </div>
          
          {/* Projects Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8">
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-48" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={projectsTableData} 
                  searchColumn="name"
                  searchPlaceholder="Search projects..."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}