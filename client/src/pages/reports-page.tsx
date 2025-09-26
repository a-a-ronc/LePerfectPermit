import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Download, Calendar, Building, Users } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("30");

  // Load all projects for comprehensive reporting
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 30000,
  });

  // Load all users for stakeholder metrics
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 30000,
  });

  // Calculate metrics from projects data
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p: any) => p.status === 'in_progress').length;
  const completedProjects = projects.filter((p: any) => p.status === 'approved').length;
  const totalStakeholders = users.filter((u: any) => u.role !== 'admin').length;

  // Get all documents across projects
  const allDocuments = projects.flatMap((project: any) => 
    (project.documents || []).map((doc: any) => ({
      ...doc,
      projectName: project.name,
      projectId: project.id,
    }))
  );

  // Project status distribution for pie chart
  const statusDistribution = [
    { name: 'Not Started', value: projects.filter((p: any) => p.status === 'not_started').length, color: '#8884d8' },
    { name: 'In Progress', value: projects.filter((p: any) => p.status === 'in_progress').length, color: '#82ca9d' },
    { name: 'Ready for Submission', value: projects.filter((p: any) => p.status === 'ready_for_submission').length, color: '#ffc658' },
    { name: 'Under Review', value: projects.filter((p: any) => p.status === 'under_review').length, color: '#ff7300' },
    { name: 'Approved', value: projects.filter((p: any) => p.status === 'approved').length, color: '#00ff00' },
    { name: 'Rejected', value: projects.filter((p: any) => p.status === 'rejected').length, color: '#ff0000' },
  ].filter(item => item.value > 0);

  // Document status metrics
  const documentMetrics = {
    total: allDocuments.length,
    approved: allDocuments.filter(d => d.status === 'approved').length,
    pending: allDocuments.filter(d => d.status === 'pending_review').length,
    underReview: allDocuments.filter(d => d.status === 'under_review').length,
    rejected: allDocuments.filter(d => d.status === 'rejected').length,
  };

  // Recent activity data (mock data for demonstration)
  const recentActivity = projects.slice(0, 5).map((project: any) => ({
    projectName: project.name,
    status: project.status,
    lastUpdated: project.updatedAt || project.createdAt,
    documentsCount: (project.documents || []).length,
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'ready_for_submission':
        return <Badge variant="default">Ready for Submission</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="border-orange-300 text-orange-700">Under Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingProjects || isLoadingUsers) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into project performance and progress
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeProjects} active
                </p>
              </div>
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documentMetrics.total}</p>
                <p className="text-xs text-green-600 mt-1">
                  {documentMetrics.approved} approved
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-orange-600">{documentMetrics.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {documentMetrics.underReview} in review
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
                <p className="text-sm font-medium text-muted-foreground">Total Stakeholders</p>
                <p className="text-2xl font-bold">{totalStakeholders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all projects
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Current status of all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Document Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Document Status Overview</CardTitle>
            <CardDescription>Distribution of document approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Approved', count: documentMetrics.approved, fill: '#22c55e' },
                { name: 'Pending', count: documentMetrics.pending, fill: '#f59e0b' },
                { name: 'Under Review', count: documentMetrics.underReview, fill: '#3b82f6' },
                { name: 'Rejected', count: documentMetrics.rejected, fill: '#ef4444' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Project Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.projectName}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {item.documentsCount} documents
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {item.lastUpdated ? format(new Date(item.lastUpdated), 'MMM dd, yyyy') : 'Unknown'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedProjects} of {totalProjects} projects
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Document Approval Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {documentMetrics.total > 0 ? Math.round((documentMetrics.approved / documentMetrics.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {documentMetrics.approved} of {documentMetrics.total} documents
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Documents per Project</p>
                <p className="text-2xl font-bold">
                  {totalProjects > 0 ? Math.round(documentMetrics.total / totalProjects) : 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all projects
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}