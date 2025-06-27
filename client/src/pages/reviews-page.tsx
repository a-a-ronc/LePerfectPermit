import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function ReviewsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load all projects to get documents that need review
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 30000,
  });

  // Get all documents that need review from all projects
  const documentsNeedingReview = projects.flatMap((project: any) => 
    (project.documents || []).filter((doc: any) => 
      doc.status === 'pending_review' || doc.status === 'under_review'
    ).map((doc: any) => ({
      ...doc,
      projectName: project.name,
      projectId: project.id,
    }))
  );

  // Filter documents based on search and status
  const filteredDocuments = documentsNeedingReview.filter((doc: any) => {
    const matchesSearch = searchTerm === "" || 
      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="outline" className="text-orange-600 border-orange-200"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="text-blue-600 border-blue-200"><AlertTriangle className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoadingProjects) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Document Reviews</h1>
        <p className="text-muted-foreground">
          Manage and track document reviews across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documentsNeedingReview.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">
                  {documentsNeedingReview.filter(d => d.status === 'pending_review').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">
                  {documentsNeedingReview.filter(d => d.status === 'under_review').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename, project, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents for Review ({filteredDocuments.length})</CardTitle>
          <CardDescription>
            Click on any document to review and approve or reject it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== "all" 
                        ? "No documents match your filters" 
                        : "No documents pending review"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc: any) => (
                    <TableRow key={`${doc.projectId}-${doc.id}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-sm text-muted-foreground">
                              Version {doc.version || '1'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project/${doc.projectId}`} className="text-blue-600 hover:underline">
                          {doc.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatCategory(doc.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doc.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">
                              {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'MMM dd, yyyy') : 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {doc.uploadedAt ? formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true }) : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project/${doc.projectId}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}