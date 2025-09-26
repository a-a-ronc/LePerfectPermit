import { format, formatDistanceToNow, isBefore, isAfter, addDays } from "date-fns";

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = new Date(date);
  return format(dateObj, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = new Date(date);
  return format(dateObj, "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getDaysRemaining(deadline: Date | string | number | null | undefined): number | null {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  
  // Calculate the difference in milliseconds
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  // Convert to days and round
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDeadline(deadline: Date | string | number | null | undefined): { 
  text: string, 
  isUrgent: boolean,
  daysLeft: number | null
} {
  if (!deadline) {
    return { text: "No deadline", isUrgent: false, daysLeft: null };
  }
  
  const deadlineDate = new Date(deadline);
  const daysLeft = getDaysRemaining(deadline);
  
  // If deadline has passed
  if (isBefore(deadlineDate, new Date())) {
    return { 
      text: `Overdue by ${Math.abs(daysLeft!)} days`, 
      isUrgent: true,
      daysLeft
    };
  }
  
  // If deadline is within 7 days
  if (daysLeft! <= 7) {
    return { 
      text: daysLeft === 0 
        ? "Due today" 
        : daysLeft === 1 
          ? "Due tomorrow" 
          : `${daysLeft} days left`, 
      isUrgent: true,
      daysLeft
    };
  }
  
  // Regular deadline
  return { 
    text: `${formatDate(deadline)} (${daysLeft} days)`, 
    isUrgent: false,
    daysLeft
  };
}
