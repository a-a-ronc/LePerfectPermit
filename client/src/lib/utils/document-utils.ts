import { DocumentCategory, DocumentCategoryType, DocumentStatus, DocumentStatusType } from "@shared/schema";

export function formatDocumentCategory(category: DocumentCategoryType | string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getDocumentCategoryDescription(category: DocumentCategoryType | string): string {
  switch (category) {
    case DocumentCategory.SITE_PLAN:
      return "Dimensioned site plan showing streets, building location, fire hydrants, and fire department access roadways.";
    case DocumentCategory.FACILITY_PLAN:
      return "Dimensioned floor plan showing proposed and existing racking, fire department access doors, etc.";
    case DocumentCategory.EGRESS_PLAN:
      return "Floor plan showing means of egress components (aisles, exit access doors, exit doors, etc).";
    case DocumentCategory.STRUCTURAL_PLANS:
      return "Racking plan, shelf dimensions, structural calculations stamped by a licensed engineer.";
    case DocumentCategory.COMMODITIES:
      return "Description of commodities stored and their placement method.";
    case DocumentCategory.FIRE_PROTECTION:
      return "Information about existing fire protection systems including type of sprinkler system.";
    case DocumentCategory.SPECIAL_INSPECTION:
      return "Special Inspection Agreement with 'Storage Racks' marked as requiring inspection.";
    case DocumentCategory.COVER_LETTER:
      return "Auto-generated comprehensive overview for municipal submission.";
    default:
      return "Document for High-Piled Storage Permit";
  }
}

export function getDocumentStatusColor(status: DocumentStatusType | string): { bg: string, text: string } {
  switch (status) {
    case DocumentStatus.APPROVED:
      return { bg: "bg-green-100", text: "text-green-800" };
    case DocumentStatus.PENDING_REVIEW:
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case DocumentStatus.REJECTED:
      return { bg: "bg-red-100", text: "text-red-800" };
    case DocumentStatus.NOT_SUBMITTED:
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
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
