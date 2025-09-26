import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface Stakeholder {
  id: number;
  userId: number;
  projectId: number;
  role: string;
  user?: {
    fullName: string;
    email: string;
  };
}

interface StakeholderListProps {
  stakeholders: Stakeholder[];
  projectId?: number;
  isLoading?: boolean;
  onAddStakeholder?: () => void;
}

export function StakeholderList({ 
  stakeholders, 
  projectId,
  isLoading = false,
  onAddStakeholder
}: StakeholderListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (stakeholders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stakeholders</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding a stakeholder to this project.
            </p>
            {onAddStakeholder && (
              <div className="mt-6">
                <Button onClick={onAddStakeholder}>
                  Add Stakeholder
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {stakeholders.map((stakeholder) => (
        <div key={stakeholder.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 dark:primary/20 text-primary">
                {stakeholder.user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{stakeholder.user?.fullName || 'Unknown User'}</div>
              <div className="text-sm text-muted-foreground">{stakeholder.role}</div>
              {stakeholder.user?.email && (
                <div className="text-xs text-gray-400">{stakeholder.user.email}</div>
              )}
            </div>
          </div>
          
          {projectId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/project/${projectId}/stakeholder/${stakeholder.id}`}>
                View Details
              </Link>
            </Button>
          )}
        </div>
      ))}
      
      {onAddStakeholder && (
        <div className="pt-2 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onAddStakeholder} 
            className="w-full"
          >
            Add Stakeholder
          </Button>
        </div>
      )}
    </div>
  );
}
