import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Building, Calendar, CheckCircle, Clock, AlertTriangle, Search, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function StakeholderPage() {
  const { user } = useAuth();
  const [selectedStakeholder, setSelectedStakeholder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load all users who can be stakeholders
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 30000,
  });

  // Filter stakeholders based on search term
  const stakeholders = (allUsers as any[]).filter((stakeholder: any) => 
    stakeholder.role !== 'admin' && (
      stakeholder.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stakeholder.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stakeholder.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'specialist': return 'default';
      case 'engineer': return 'secondary';
      case 'architect': return 'outline';
      case 'project_manager': return 'destructive';
      case 'stakeholder': return 'secondary';
      default: return 'outline';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoadingUsers) {
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
        <h1 className="text-3xl font-bold tracking-tight">Stakeholders</h1>
        <p className="text-muted-foreground">
          Manage and view all stakeholders across projects
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stakeholders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Stakeholders ({stakeholders.length})</CardTitle>
          <CardDescription>
            Click on any stakeholder to view detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? `No stakeholders found matching "${searchTerm}"` : 'No stakeholders found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  stakeholders.map((stakeholder: any) => (
                    <TableRow key={stakeholder.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{stakeholder.fullName || stakeholder.username}</div>
                            <div className="text-sm text-muted-foreground">@{stakeholder.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(stakeholder.role)}>
                          {formatRole(stakeholder.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stakeholder.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stakeholder.defaultContactPhone || 'Not provided'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStakeholder(stakeholder)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Details Dialog */}
      {selectedStakeholder && (
        <Dialog open={!!selectedStakeholder} onOpenChange={() => setSelectedStakeholder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{selectedStakeholder.fullName || selectedStakeholder.username}</div>
                  <div className="text-sm text-muted-foreground">@{selectedStakeholder.username}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedStakeholder.email}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedStakeholder.defaultContactPhone || 'Not provided'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Role</label>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={getRoleBadgeVariant(selectedStakeholder.role)}>
                          {formatRole(selectedStakeholder.role)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedStakeholder.createdAt ? format(new Date(selectedStakeholder.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Default Contact Email</label>
                      <div className="p-2 bg-muted rounded-md text-sm">
                        {selectedStakeholder.defaultContactEmail || 'Not set'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                      <div className="p-2 bg-muted rounded-md">
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}