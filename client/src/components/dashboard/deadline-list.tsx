import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { formatDeadline } from "@/lib/utils/date-utils";
import { Link } from "wouter";

interface Deadline {
  id: number;
  name: string;
  status: string;
  deadline: string;
}

interface DeadlineListProps {
  deadlines: Deadline[];
  isLoading?: boolean;
}

export function DeadlineList({ deadlines, isLoading = false }: DeadlineListProps) {
  if (isLoading) {
    return (
      <ul className="divide-y divide-gray-200">
        {Array(3).fill(0).map((_, i) => (
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
        ))}
      </ul>
    );
  }

  // If no deadlines, show empty state
  if (deadlines.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-muted-foreground">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {deadlines.map(project => {
        const { text, isUrgent, daysLeft } = formatDeadline(project.deadline);
        let urgencyClass = "bg-green-100 text-green-500";
        
        if (daysLeft && daysLeft <= 3) {
          urgencyClass = "bg-red-100 text-red-500";
        } else if (daysLeft && daysLeft <= 7) {
          urgencyClass = "bg-yellow-100 dark:bg-yellow-900 text-yellow-500";
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
                  <p className="text-sm text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
                  {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                </p>
              </div>
            </div>
          </li>
        );
      })}
      <li className="pt-6">
        <Button variant="outline" className="w-full">
          <Link href="/calendar">View full calendar</Link>
        </Button>
      </li>
    </ul>
  );
}
