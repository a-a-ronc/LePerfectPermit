import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  DocumentStatus, 
  DocumentCategory, 
  DocumentStatusType 
} from "@shared/schema";
import { ColumnDef } from "@tanstack/react-table";
import { 
  getDocumentStatusColor, 
  getDocumentStatusLabel, 
  formatDocumentCategory 
} from "@/lib/utils/document-utils";
import { formatDateTime } from "@/lib/utils/date-utils";

type DocumentRow = {
  id: number;
  projectId: number;
  projectName: string;
  category: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatusType;
  version: number;
};

export default function DocumentsPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Load all projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Function to get all documents from all projects
  const fetchAllDocuments = async () => {
    const allDocuments: DocumentRow[] = [];
    
    for (const project of projects) {
      const res = await fetch(`/api/projects/${project.id}/documents`, {
        credentials: "include",
      });
      
      if (res.ok) {
        try {
          const documents = await res.json();
        
        // Add project name to each document
        documents.forEach((doc: any) => {
          // Get uploader name
          const uploaderRes = fetch(`/api/users/${doc.uploadedById}`, {
            credentials: "include",
          }).then(res => res.ok ? res.json() : { fullName: "Unknown" });
          
          allDocuments.push({
            ...doc,
            projectName: project.name,
            uploadedBy: "User", // Will be updated below
          });
          
          // This would be better with Promise.all, but we'll keep it simple
          uploaderRes.then(user => {
            const index = allDocuments.findIndex(d => d.id === doc.id);
            if (index >= 0) {
              allDocuments[index].uploadedBy = user.fullName;
            }
          });
        });
        } catch (error) {
          console.error('Error parsing documents JSON:', error);
        }
      }
    }
    
    return allDocuments;
  };

  // Load all documents
  const { data: allDocuments = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: fetchAllDocuments,
    enabled: projects.length > 0,
  });
  
  const isLoading = isLoadingProjects || isLoadingDocuments;
  
  // Filter documents based on selected status and category
  const filteredDocuments = allDocuments.filter(doc => {
    if (statusFilter && doc.status !== statusFilter) {
      return false;
    }
    if (categoryFilter && doc.category !== categoryFilter) {
      return false;
    }
    return true;
  });
  
  const columns: ColumnDef<DocumentRow>[] = [
    {
      accessorKey: "fileName",
      header: "Document",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fileName}</div>
          <div className="text-sm text-gray-500">{formatDocumentCategory(row.original.category)}</div>
        </div>
      ),
    },
    {
      accessorKey: "projectName",
      header: "Project",
      cell: ({ row }) => (
        <Link href={`/project/${row.original.projectId}`}>
          <a className="text-primary hover:underline">{row.original.projectName}</a>
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const { bg, text } = getDocumentStatusColor(status);
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
            {getDocumentStatusLabel(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "uploadedBy",
      header: "Uploaded By",
      cell: ({ row }) => <div>{row.original.uploadedBy}</div>,
    },
    {
      accessorKey: "uploadedAt",
      header: "Date",
      cell: ({ row }) => <div>{formatDateTime(row.original.uploadedAt)}</div>,
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => <div>v{row.original.version}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/project/${row.original.projectId}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];
  
  return (
    <div className="min-h-screen">
      <Header breadcrumb={[
        { label: "Dashboard", href: "/" },
        { label: "Documents" }
      ]} />
      
      <div className="p-6 overflow-auto h-[calc(100vh-64px)]">
          <div className="mb-6 flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Management</h1>
              <p className="text-gray-500">View and manage all documents across all projects.</p>
            </div>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {statusFilter ? getDocumentStatusLabel(statusFilter) : "All Statuses"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                      All Statuses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter(DocumentStatus.APPROVED)}>
                      Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter(DocumentStatus.PENDING_REVIEW)}>
                      In Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter(DocumentStatus.REJECTED)}>
                      Rejected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter(DocumentStatus.NOT_SUBMITTED)}>
                      Not Submitted
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {categoryFilter ? formatDocumentCategory(categoryFilter) : "All Categories"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                      All Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.SITE_PLAN)}>
                      Site Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.FACILITY_PLAN)}>
                      Facility Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.EGRESS_PLAN)}>
                      Egress Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.STRUCTURAL_PLANS)}>
                      Structural Plans
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.COMMODITIES)}>
                      Commodities
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.FIRE_PROTECTION)}>
                      Fire Protection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.SPECIAL_INSPECTION)}>
                      Special Inspection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCategoryFilter(DocumentCategory.COVER_LETTER)}>
                      Cover Letter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
          
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
                  data={filteredDocuments} 
                  searchColumn="fileName"
                  searchPlaceholder="Search documents..."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
