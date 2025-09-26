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
      { id: "site_streets", label: "Streets and overall building outline", checked: false },
      { id: "site_hydrants", label: "Fire hydrant locations", checked: false },
      { id: "site_access", label: "Fire department access roadways", checked: false },
      { id: "site_key_plan", label: "Key plan showing project area", checked: false },
      { id: "site_address", label: "Correct building address and suite/subaddress", checked: false },
    ],
  },
  [DocumentCategory.FACILITY_PLAN]: {
    title: "Building/Floor Plan Checklist",
    items: [
      { id: "facility_racking", label: "Proposed racking layout and any existing racks", checked: false },
      { id: "facility_doors", label: "Fire department access doors", checked: false },
      { id: "facility_valves", label: "Fire department hose valves", checked: false },
      { id: "facility_pump", label: "Fire pump / riser room", checked: false },
      { id: "facility_water", label: "Valves controlling sprinkler water supply", checked: false },
      { id: "facility_smoke", label: "Smoke removal and curtain board systems", checked: false },
      { id: "facility_extinguishers", label: "Portable fire extinguishers", checked: false },
    ],
  },
  [DocumentCategory.EGRESS_PLAN]: {
    title: "Egress Plan Checklist",
    items: [
      { id: "egress_aisles", label: "Aisle layout with widths shown", checked: false },
      { id: "egress_exits", label: "Exit access doors, exit doors, and exit discharge points", checked: false },
      { id: "egress_deadend", label: "Dead-end aisles ≤ 20 ft in Group M, ≤ 50 ft in other occupancies", checked: false },
      { id: "egress_signs", label: "Exit sign locations (IBC 1013)", checked: false },
      { id: "egress_lighting", label: "Emergency egress lighting (avg 1 fc / min 0.1 fc at floor)", checked: false },
    ],
  },
  [DocumentCategory.STRUCTURAL_PLANS]: {
    title: "Racking/Structural Plan Checklist",
    items: [
      { id: "structural_aisles", label: "Aisle widths dimensioned", checked: false },
      { id: "structural_types", label: "Rack types and heights identified", checked: false },
      { id: "structural_volume", label: "Maximum pile volume for each storage array", checked: false },
      { id: "structural_shelves", label: "Shelf type (solid, slatted, wire grid, or open)", checked: false },
      { id: "structural_flue", label: "Transverse and longitudinal flue space dimensions", checked: false },
      { id: "structural_tiers", label: "Number of tiers", checked: false },
      { id: "structural_height", label: "Floor-to-top-shelf height and floor-to-top-of-storage height", checked: false },
      { id: "structural_clearances", label: "Clearances to sprinkler deflectors, bottom of joists, and roof deck", checked: false },
      { id: "structural_calcs", label: "Signed and sealed by a licensed structural engineer", checked: false },
      { id: "structural_seismic", label: "Seismic design per ASCE 7 § 15.5.3", checked: false },
      { id: "structural_anchors", label: "Load combinations and anchor design included", checked: false },
      { id: "structural_inspection", label: '"Storage Racks (IBC 1705.12.7)" box checked in inspection agreement', checked: false },
    ],
  },
  [DocumentCategory.COMMODITIES]: {
    title: "Commodity Description Checklist",
    items: [
      { id: "commodity_class", label: "Commodity class per IFC Table 3203.8", checked: false },
      { id: "commodity_packaging", label: "Packaging method (loose, boxed, shrink-wrapped, bins, banded, etc.)", checked: false },
    ],
  },
  [DocumentCategory.FIRE_PROTECTION]: {
    title: "Fire Protection Checklist",
    items: [
      { id: "fire_system", label: "Sprinkler system type and NFPA standard", checked: false },
      { id: "fire_density", label: "Design density / curve", checked: false },
      { id: "fire_head", label: "Sprinkler head type (ESFR, CMSA, etc.)", checked: false },
      { id: "fire_detection", label: "Detection system description", checked: false },
      { id: "fire_smoke", label: "Smoke removal / curtain board specifications", checked: false },
      { id: "fire_hydraulic", label: "Photo of hydraulic calculation placard", checked: false },
      { id: "fire_compliance", label: "Conformance with IFC §§ 3206–3209", checked: false },
      { id: "fire_hose", label: "1½ in. hose outlet at each fire department access door (NFPA 13 § 8.17.5)", checked: false },
    ],
  },
  [DocumentCategory.SPECIAL_INSPECTION]: {
    title: "Special Inspection Checklist",
    items: [
      { id: "special_agency", label: "Inspection agency named", checked: false },
      { id: "special_signatures", label: "Required signatures and stamp complete", checked: false },
    ],
  },
  [DocumentCategory.COVER_LETTER]: {
    title: "Cover Letter Checklist",
    items: [
      { id: "cover_header", label: "Proper header and contact information", checked: false },
      { id: "cover_project", label: "Project details correctly stated", checked: false },
      { id: "cover_documents", label: "Lists all documents included in submission", checked: false },
      { id: "cover_signature", label: "Includes signature block", checked: false },
      { id: "cover_valuation", label: "Valuation includes rack materials (new or used) + labor", checked: false },
      { id: "cover_permits", label: "Separate electrical permit listed if wiring needed", checked: false },
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