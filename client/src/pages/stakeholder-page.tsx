import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StakeholderList } from "@/components/stakeholders/stakeholder-list";
import { PlusCircle, Users } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type StakeholderRow = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projects: { id: number; name: string }[];
};

export default function StakeholderPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("stakeholders");
  
  // Only permit specialists should be able to view this page
  if (user?.role !== "specialist") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-grow overflow-hidden">
          <Header breadcrumb={[
            { label: "Dashboard", href: "/" },
            { label: "Stakeholders" }
          ]} />
          <div className="p-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                  <p className="text-gray-500 mb-4">
                    Only permit specialists can access the stakeholder management page.
                  </p>
                  <Button asChild>
                    <Link href="/">Go to Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Load all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "specialist",
  });
  
  // Load all projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: user?.role === "specialist",
  });
  
  // Function to get stakeholders with projects
  const fetchStakeholders = async () => {
    const stakeholders: StakeholderRow[] = [];
    const stakeholderMap = new Map<number, StakeholderRow>();
    
    // First get all users with stakeholder role
    const stakeholderUsers = users.filter(u => u.role === "stakeholder");
    
    // Initialize stakeholder map
    stakeholderUsers.forEach(u => {
      stakeholderMap.set(u.id, {
        id: u.id,
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        role: "stakeholder",
        projects: [],
      });
    });
    
    // For each project, fetch stakeholders
    for (const project of projects) {
      const res = await fetch(`/api/projects/${project.id}/stakeholders`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const projectStakeholders = await res.json();
        
        // Add project to each stakeholder's projects
        projectStakeholders.forEach((stake: any) => {
          const userId = stake.userId;
          
          // If stakeholder already exists in map, add project
          if (stakeholderMap.has(userId)) {
            const stakeholder = stakeholderMap.get(userId)!;
            stakeholder.projects.push({
              id: project.id,
              name: project.name,
            });
          }
        });
      }
    }
    
    // Convert map to array
    stakeholderMap.forEach(stakeholder => {
      stakeholders.push(stakeholder);
    });
    
    return stakeholders;
  };
  
  // Load stakeholders
  const { data: stakeholders = [], isLoading: isLoadingStakeholders } = useQuery({
    queryKey: ["/api/stakeholders"],
    queryFn: fetchStakeholders,
    enabled: user?.role === "specialist" && users.length > 0 && projects.length > 0,
  });
  
  const isLoading = isLoadingUsers || isLoadingProjects || isLoadingStakeholders;
  
  const columns: ColumnDef<StakeholderRow>[] = [
    {
      accessorKey: "fullName",
      header: "Stakeholder",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback className="bg-primary/10 text-primary">
              {row.original.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.original.fullName}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "projects",
      header: "Associated Projects",
      cell: ({ row }) => {
        const projects = row.original.projects;
        return (
          <div>
            {projects.length === 0 ? (
              <span className="text-gray-500">No projects</span>
            ) : projects.length <= 2 ? (
              projects.map((project, i) => (
                <div key={project.id}>
                  <Link href={`/project/${project.id}`}>
                    <a className="text-primary hover:underline">{project.name}</a>
                  </Link>
                </div>
              ))
            ) : (
              <div>
                <Link href={`/project/${projects[0].id}`}>
                  <a className="text-primary hover:underline">{projects[0].name}</a>
                </Link>
                <div className="text-sm text-gray-500">
                  + {projects.length - 1} more projects
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/stakeholders/${row.original.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-grow overflow-hidden">
        <Header breadcrumb={[
          { label: "Dashboard", href: "/" },
          { label: "Stakeholders" }
        ]} />
        
        <div className="p-6 overflow-auto h-[calc(100vh-64px)]">
          <div className="mb-6 flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-secondary">Stakeholder Management</h1>
              <p className="text-gray-500">Manage project stakeholders and their access.</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8">
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-40 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={stakeholders} 
                  searchColumn="fullName"
                  searchPlaceholder="Search stakeholders..."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
