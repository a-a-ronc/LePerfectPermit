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
  Filter
} from "lucide-react";
import { formatDate, formatDeadline } from "@/lib/utils/date-utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";
import { calculateProjectDocumentProgress } from "@/lib/utils/document-utils";
import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a custom form schema specifically for the client-side form
const clientFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  facilityAddress: z.string().min(1, "Facility address is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  jurisdictionAddress: z.string().optional(),
  clientName: z.string().min(1, "Customer name is required"),
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
};

export default function ProjectPage() {
  const [user, setUser] = useState<any>(null);
  
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
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  // Load documents for projects to calculate progress
  const { data: documentsByProject = {}, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/projects/documents"],
    queryFn: async () => {
      const projectDocuments: Record<number, any[]> = {};
      
      // For each project, fetch its documents
      for (const project of projects) {
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
    enabled: projects.length > 0,
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
      zipCode: "",
      status: "not_started",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    },
  });
  
  const onSubmit = async (data: ProjectFormValues) => {
    try {
      // Format the data before sending - convert string date to Date object
      const formattedData = {
        ...data,
        zipCode: data.zipCode || null,
        jurisdictionAddress: data.jurisdictionAddress || null,
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
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      const result = await response.json();
      console.log("Project creation result:", result);
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "New project has been successfully created.",
      });
      
      // Refresh the page to show the newly created project
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to allow the toast to be visible
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
  const projectsTableData: ProjectRow[] = projects.map(project => {
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
      actions: project.id.toString()
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
      cell: ({ row }) => (
        <Link href={`/project/${row.original.id}`}>
          <div className="text-primary hover:text-primary/80 cursor-pointer">View</div>
        </Link>
      ),
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="mt-2 md:mt-0">
                    <Plus className="mr-2 h-4 w-4" /> New Project
                  </Button>
                </DialogTrigger>
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
