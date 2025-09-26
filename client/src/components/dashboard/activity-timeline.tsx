import React from "react";
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  Calendar,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils/date-utils";

interface Activity {
  id: number;
  projectId: number;
  userId: number;
  activityType: string;
  description: string;
  createdAt: string;
  user?: {
    fullName: string;
  };
}

interface ActivityTimelineProps {
  activities: Activity[];
  limit?: number;
  showViewAllButton?: boolean;
  isLoading?: boolean;
}

export function ActivityTimeline({ 
  activities, 
  limit = 4,
  showViewAllButton = true,
  isLoading = false 
}: ActivityTimelineProps) {
  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="flow-root">
        <ul className="-mb-8">
          {Array(limit).fill(0).map((_, i) => (
            <li key={i}>
              <div className="relative pb-8">
                {i < limit - 1 && (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <Skeleton className="h-4 w-60" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // If no activities, show empty state
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
        <p className="text-muted-foreground">
          Activity will appear here as stakeholders upload documents and permit specialists review them.
        </p>
      </div>
    );
  }

  // Show activities
  const limitedActivities = activities.slice(0, limit);

  const activityTypeIcons: Record<string, JSX.Element> = {
    document_uploaded: <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
      <FileText className="h-5 w-5 text-white" />
    </span>,
    document_approved: <span className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-9000 flex items-center justify-center ring-8 ring-white">
      <CheckCircle2 className="h-5 w-5 text-white" />
    </span>,
    document_rejected: <span className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-9000 flex items-center justify-center ring-8 ring-white">
      <AlertTriangle className="h-5 w-5 text-white" />
    </span>,
    document_pending_review: <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
      <Clock className="h-5 w-5 text-white" />
    </span>,
    stakeholder_added: <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
      <Users className="h-5 w-5 text-white" />
    </span>,
    project_created: <span className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center ring-8 ring-white">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </span>,
    commodities_added: <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </span>,
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {limitedActivities.map((activity, index) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {index < limitedActivities.length - 1 && (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
              )}
              <div className="relative flex space-x-3">
                <div>
                  {activityTypeIcons[activity.activityType] || (
                    <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                    <time dateTime={activity.createdAt}>
                      {formatRelativeTime(activity.createdAt)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {showViewAllButton && activities.length > limit && (
        <div className="mt-6">
          <Button variant="outline" className="w-full">
            View all activity
          </Button>
        </div>
      )}
    </div>
  );
}
