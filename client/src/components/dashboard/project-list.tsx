import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { formatDeadline } from "@/lib/utils/date-utils";
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/utils/status-utils";

export interface ProjectRow {
  id: number;
  name: string;
  permitNumber: string;
  location: string;
  status: string;
  documentsProgress: number;
  deadline: string;
  actions: string;
}

interface ProjectListProps {
  projects: ProjectRow[];
  isLoading?: boolean;
}

export function ProjectList({ projects, isLoading = false }: ProjectListProps) {
  const columns: ColumnDef<ProjectRow>[] = [
    {
      accessorKey: "name",
      header: "Project",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">Permit #{row.original.permitNumber}</div>
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
            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
        if (!deadline) return <span className="text-muted-foreground">No deadline</span>;
        
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
          <a className="text-primary hover:text-primary/80">View</a>
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Active Permit Projects</h2>
          </div>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Active Permit Projects</h2>
        </div>
        <DataTable 
          columns={columns} 
          data={projects} 
          searchColumn="name"
          searchPlaceholder="Search projects..."
        />
      </CardContent>
    </Card>
  );
}
