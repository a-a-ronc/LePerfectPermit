import { DocumentCategory, DocumentCategoryType, DocumentStatus, DocumentStatusType } from "@shared/schema";

export function formatDocumentCategory(category: DocumentCategoryType | string): string {
  // Map of categories to formatted display names
  const displayNames: Record<string, string> = {
    [DocumentCategory.SITE_PLAN]: "Site Plan",
    [DocumentCategory.FACILITY_PLAN]: "Facility Plan",
    [DocumentCategory.EGRESS_PLAN]: "Egress Plan",
    [DocumentCategory.STRUCTURAL_PLANS]: "Structural Plans",
    [DocumentCategory.COMMODITIES]: "Commodities Form",
    [DocumentCategory.FIRE_PROTECTION]: "Fire Protection",
    [DocumentCategory.SPECIAL_INSPECTION]: "Special Inspection",
    [DocumentCategory.COVER_LETTER]: "Cover Letter",
  };
  
  // Return the mapped display name or fallback to properly formatted category
  return displayNames[category] || category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getDocumentCategoryDescription(category: DocumentCategoryType | string): string {
  switch (category) {
    case DocumentCategory.SITE_PLAN:
      return "Streets and overall building outline, fire hydrant locations, fire department access roadways, key plan showing project area.";
    case DocumentCategory.FACILITY_PLAN:
      return "Proposed racking layout, fire department access doors, hose valves, pump rooms, and water supply controls.";
    case DocumentCategory.EGRESS_PLAN:
      return "Aisle layout with widths, exit access doors, exit doors, discharge points, and emergency lighting details.";
    case DocumentCategory.STRUCTURAL_PLANS:
      return "Rack types and heights, shelf specifications, flue space dimensions, floor-to-top measurements, and structural calculations.";
    case DocumentCategory.COMMODITIES:
      return "Commodity class per IFC Table 3203.8 and packaging method (loose, boxed, shrink-wrapped, bins, etc.).";
    case DocumentCategory.FIRE_PROTECTION:
      return "Sprinkler system specifications, detection systems, hydraulic calculations, and compliance with fire code requirements.";
    case DocumentCategory.SPECIAL_INSPECTION:
      return "Required storage rack inspection documentation with proper signatures and inspection agency details.";
    case DocumentCategory.COVER_LETTER:
      return "Project overview, valuation details, permit requirements, and comprehensive documentation list for submission.";
    default:
      return "Document for High-Piled Storage Permit application";
  }
}

export function getDocumentStatusColor(status: DocumentStatusType | string): { bg: string, text: string } {
  switch (status) {
    case DocumentStatus.APPROVED:
      return { bg: "bg-green-100", text: "text-green-800" };
    case DocumentStatus.PENDING_REVIEW:
      return { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-800" };
    case DocumentStatus.REJECTED:
      return { bg: "bg-red-100", text: "text-red-800" };
    case DocumentStatus.NOT_SUBMITTED:
    default:
      return { bg: "bg-muted", text: "text-gray-800" };
  }
}

export function getDocumentStatusLabel(status: DocumentStatusType | string): string {
  switch (status) {
    case DocumentStatus.APPROVED:
      return "Approved";
    case DocumentStatus.PENDING_REVIEW:
      return "In Review";
    case DocumentStatus.REJECTED:
      return "Rejected";
    case DocumentStatus.NOT_SUBMITTED:
      return "Not Submitted";
    default:
      return "Unknown Status";
  }
}

export function calculateProjectDocumentProgress(documents: any[]): number {
  if (!documents || documents.length === 0) {
    return 0;
  }
  
  // For simplicity, count each document category only once (use the latest version)
  const categories = new Set(documents.map(doc => doc.category));
  const totalCategories = 7; // 7 standard categories excluding cover letter
  
  // Count approved documents by category
  const approvedCategories = new Set();
  documents.forEach(doc => {
    if (doc.status === DocumentStatus.APPROVED && doc.category !== DocumentCategory.COVER_LETTER) {
      approvedCategories.add(doc.category);
    }
  });
  
  return Math.round((approvedCategories.size / totalCategories) * 100);
}
