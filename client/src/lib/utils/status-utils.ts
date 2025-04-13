import { ProjectStatus, ProjectStatusType } from "@shared/schema";

export function getProjectStatusColor(status: ProjectStatusType | string): { bg: string, text: string } {
  switch (status) {
    case ProjectStatus.APPROVED:
      return { bg: "bg-green-100", text: "text-green-800" };
    case ProjectStatus.IN_PROGRESS:
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case ProjectStatus.READY_FOR_SUBMISSION:
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case ProjectStatus.UNDER_REVIEW:
      return { bg: "bg-indigo-100", text: "text-indigo-800" };
    case ProjectStatus.REJECTED:
      return { bg: "bg-red-100", text: "text-red-800" };
    case ProjectStatus.NOT_STARTED:
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
  }
}

export function getProjectStatusLabel(status: ProjectStatusType | string): string {
  switch (status) {
    case ProjectStatus.APPROVED:
      return "Approved";
    case ProjectStatus.IN_PROGRESS:
      return "In Progress";
    case ProjectStatus.READY_FOR_SUBMISSION:
      return "Ready for Submission";
    case ProjectStatus.UNDER_REVIEW:
      return "Under Review";
    case ProjectStatus.REJECTED:
      return "Rejected";
    case ProjectStatus.NOT_STARTED:
      return "Not Started";
    default:
      return "Unknown Status";
  }
}

export function getProjectStatusByProgress(progress: number): ProjectStatusType {
  if (progress === 100) {
    return ProjectStatus.READY_FOR_SUBMISSION;
  } else if (progress >= 60) {
    return ProjectStatus.IN_PROGRESS;
  } else if (progress > 0) {
    return ProjectStatus.IN_PROGRESS;
  } else {
    return ProjectStatus.NOT_STARTED;
  }
}
