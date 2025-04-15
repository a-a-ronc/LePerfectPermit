import { DocumentCategory } from "@shared/schema";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface CategoryChecklist {
  title: string;
  items: ChecklistItem[];
}

export const categoryChecklists: Record<string, CategoryChecklist> = {
  [DocumentCategory.SITE_PLAN]: {
    title: "Site Plan Checklist",
    items: [
      { id: "site_streets", label: "Dimensioned site plan showing streets", checked: false },
      { id: "site_building", label: "Building location", checked: false },
      { id: "site_hydrants", label: "Fire Hydrants", checked: false },
      { id: "site_access", label: "Fire Department access roadways", checked: false },
    ],
  },
  [DocumentCategory.FACILITY_PLAN]: {
    title: "Facility Plan Checklist",
    items: [
      { id: "facility_floorplan", label: "Dimensioned floorplan and existing racking if applicable", checked: false },
      { id: "facility_doors", label: "Fire department access doors", checked: false },
      { id: "facility_heights", label: "Clear heights", checked: false },
    ],
  },
  [DocumentCategory.EGRESS_PLAN]: {
    title: "Egress Component Checklist",
    items: [
      { id: "egress_aisles", label: "Aisles", checked: false },
      { id: "egress_access_doors", label: "Exit Access Doors", checked: false },
      { id: "egress_doors", label: "Exit Doors", checked: false },
      { id: "egress_paths", label: "Dimensioned Walk Paths", checked: false },
    ],
  },
  [DocumentCategory.STRUCTURAL_PLANS]: {
    title: "Structural Component Checklist",
    items: [
      { id: "structural_racking", label: "Racking Plan", checked: false },
      { id: "structural_dimensions", label: "Shelf Dimensions", checked: false },
      { id: "structural_calculations", label: "Stamped Structural Calculations by PE", checked: false },
    ],
  },
  [DocumentCategory.COMMODITIES]: {
    title: "Commodity Checklist",
    items: [
      { id: "commodity_description", label: "Commodity Description", checked: false },
      { id: "commodity_placement", label: "Placement Method", checked: false },
    ],
  },
  [DocumentCategory.FIRE_PROTECTION]: {
    title: "Fire Protection Checklist",
    items: [
      { id: "fire_plans", label: "Fire Sprinkler Plans", checked: false },
      { id: "fire_flow", label: "Hydraulic Flow Test", checked: false },
      { id: "fire_calculations", label: "Hydraulic Calculations for Remote Area(s)", checked: false },
      { id: "fire_materials", label: "Material Checklist (type of pipe, hanging material, types of sprinklers etc.)", checked: false },
    ],
  },
  [DocumentCategory.SPECIAL_INSPECTION]: {
    title: "Special Inspection Checklist",
    items: [
      { id: "special_type", label: "Verify inspection type is written in report", checked: false },
    ],
  },
  [DocumentCategory.COVER_LETTER]: {
    title: "Cover Letter Checklist",
    items: [
      { id: "cover_header", label: "Proper header and contact information", checked: false },
      { id: "cover_project", label: "Project details correctly stated", checked: false },
      { id: "cover_documents", label: "Lists all documents included in submission", checked: false },
      { id: "cover_signature", label: "Includes signature block", checked: false },
    ],
  },
};

export function getChecklistForCategory(category: string): CategoryChecklist {
  return categoryChecklists[category] || {
    title: `${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Checklist`,
    items: [
      { id: "general_complete", label: "Document is complete", checked: false },
      { id: "general_legible", label: "Document is legible", checked: false },
      { id: "general_accurate", label: "Information appears accurate", checked: false },
    ],
  };
}