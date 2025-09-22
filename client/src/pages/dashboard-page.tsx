import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  Trash2,
  MoreVertical
} from "lucide-react";
import { formatRelativeTime, formatDeadline } from "@/lib/utils/date-utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";
import { calculateProjectDocumentProgress } from "@/lib/utils/document-utils";
import { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

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

interface DashboardPageProps {
  onLogout?: () => void;
}

export default function DashboardPage({ onLogout }: DashboardPageProps = {}) {
  const [, navigate] = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const { toast } = useToast();

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return await apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/documents"] });
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });
  
  // Fetch user data directly
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else if (response.status === 401) {
          // If unauthorized, redirect to login
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/auth');
      }
    };
    
    fetchUser();
  }, [navigate]);
  
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
  
  // Prepare metrics
  const totalProjects = projects.length;
  const approvedProjects = projects.filter(p => p.status === "approved").length;
  const inProgressProjects = projects.filter(p => p.status === "in_progress").length;
  const actionRequiredProjects = projects.filter(p => 
    p.status === "rejected" || 
    (p.deadline && new Date(p.deadline) < new Date())
  ).length;
  
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
        const canDelete = userData && (userData.role === 'specialist' || project.createdBy === userData.id);
        
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
  
  // Fetch real activity data from all projects
  const { data: allActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/activities/all"],
    queryFn: async () => {
      const allActivities: any[] = [];
      
      // For each project, fetch its activities
      for (const project of projects) {
        try {
          const res = await fetch(`/api/projects/${project.id}/activities`, {
            credentials: "include",
          });
          
          if (res.ok) {
            const activities = await res.json();
            // Add project info to each activity
            const activitiesWithProject = activities.map((activity: any) => ({
              ...activity,
              projectName: project.name,
              projectId: project.id
            }));
            allActivities.push(...activitiesWithProject);
          }
        } catch (error) {
          console.error(`Error fetching activities for project ${project.id}:`, error);
        }
      }
      
      // Sort by creation date (newest first) and return top 10
      return allActivities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    },
    enabled: projects.length > 0,
  });


  
  // Get upcoming deadlines
  const upcomingDeadlines = projects
    .filter(p => p.deadline && new Date(p.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);
  

  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <span className="text-gray-500 dark:text-gray-400">Dashboard</span>
              </li>
            </ol>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none" aria-label="Search">
                <Search className="h-6 w-6" />
              </button>
            </div>
          </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6 overflow-auto h-[calc(100vh-64px)]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-secondary dark:text-white">Permit Specialist Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Welcome back, {userData?.fullName || userData?.username || 'User'}. Here's an overview of your permit projects.</p>
          </div>
          
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="ml-4 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="rounded-full bg-primary/10 p-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-gray-500 text-sm font-medium">Total Projects</h3>
                        <p className="text-2xl font-semibold">{totalProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-gray-500 text-sm font-medium">Approved</h3>
                        <p className="text-2xl font-semibold">{approvedProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="rounded-full bg-yellow-100 p-3">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-gray-500 text-sm font-medium">In Progress</h3>
                        <p className="text-2xl font-semibold">{inProgressProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="rounded-full bg-red-100 p-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-gray-500 text-sm font-medium">Action Required</h3>
                        <p className="text-2xl font-semibold">{actionRequiredProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          {/* Quick Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Quick Filters</h2>
                <div className="flex space-x-2">
                  <Link href="/projects/new">
                    <Button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium flex items-center">
                      <Plus className="h-4 w-4 mr-1" />
                      New Project
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="bg-primary/10 text-primary">All Projects</Button>
                <Button variant="outline">In Progress</Button>
                <Button variant="outline">Ready for Submission</Button>
                <Button variant="outline">Under Review</Button>
                <Button variant="outline">Approved</Button>
                <Button variant="outline">Rejected</Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Project List */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Active Permit Projects</h2>
              </div>
              
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
          
          {/* Recent Activity and Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                  </div>
                  <div className="p-4">
                    <ActivityTimeline 
                      activities={allActivities.map(activity => ({
                        id: activity.id,
                        projectId: activity.projectId,
                        userId: activity.userId,
                        activityType: activity.activityType,
                        description: `${activity.description} for ${activity.projectName}`,
                        createdAt: activity.createdAt,
                        user: activity.user
                      }))}
                      limit={4}
                      showViewAllButton={true}
                      isLoading={isLoadingActivities}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
                  </div>
                  <div className="p-4">
                    <ul className="divide-y divide-gray-200">
                      {isLoading ? (
                        Array(3).fill(0).map((_, i) => (
                          <li key={i} className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="ml-3 space-y-1">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                          </li>
                        ))
                      ) : upcomingDeadlines.length > 0 ? (
                        upcomingDeadlines.map((project) => {
                          const { text, isUrgent, daysLeft } = formatDeadline(project.deadline);
                          let urgencyClass = "bg-green-100 text-green-500";
                          
                          if (daysLeft && daysLeft <= 3) {
                            urgencyClass = "bg-red-100 text-red-500";
                          } else if (daysLeft && daysLeft <= 7) {
                            urgencyClass = "bg-yellow-100 text-yellow-500";
                          }
                          
                          return (
                            <li key={project.id} className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-10 w-10 rounded-full ${urgencyClass} flex items-center justify-center`}>
                                    <Clock className="h-6 w-6" />
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                                    <p className="text-sm text-gray-500">
                                      {project.status === "under_review" 
                                        ? "Follow up with reviewer" 
                                        : project.status === "rejected" 
                                          ? "Resubmit revised documents" 
                                          : "Submit to authority"}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-medium ${isUrgent ? "text-red-600" : "text-gray-900"}`}>
                                    {formatDeadline(project.deadline).text.split(" (")[0]}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="py-6 text-center text-gray-500">
                          No upcoming deadlines
                        </li>
                      )}
                    </ul>
                    <div className="mt-6">
                      <Button variant="outline" className="w-full">
                        View full calendar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
}
