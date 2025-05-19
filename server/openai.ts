import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (error) {
  console.warn("OpenAI client initialization failed:", error);
}

export async function generateCoverLetterWithAI(
  project: any,
  documents: any[],
  municipality: string = "local municipality"
): Promise<string> {
  try {
    // If no OpenAI API key is provided or client failed to initialize, fall back to the template-based generation
    if (!process.env.OPENAI_API_KEY || !openai) {
      console.log("Using template-based cover letter generation (no OpenAI API key available)");
      return generateTemplateCoverLetter(project, documents);
    }

    // Create a categorized document list
    const documentByCategory: Record<string, string[]> = {};
    
    documents.forEach(doc => {
      const category = formatDocumentCategory(doc.category);
      if (!documentByCategory[category]) {
        documentByCategory[category] = [];
      }
      documentByCategory[category].push(doc.fileName);
    });
    
    // Format document list by category
    const formattedDocumentList = Object.entries(documentByCategory)
      .map(([category, docs]) => {
        return `${category}:\n${docs.map(doc => `  - ${doc}`).join('\n')}`;
      })
      .join('\n\n');

    // Build document descriptions map
    const documentDescriptions: Record<string, string> = {
      "site_plan": "Site plan showing the building layout, locations of exits, and fire access points",
      "facility_plan": "Detailed facility plan with dimensions and structural information",
      "egress_plan": "Plan showing all emergency exits, egress paths, and evacuation routes",
      "structural_plans": "Engineering drawings showing rack layouts and structural specifications",
      "commodities": "Documentation of stored materials, their classifications, and storage arrangements",
      "fire_protection": "Specifications for fire suppression systems and fire prevention measures",
      "special_inspection": "Reports from certified inspection authorities and compliance documentation",
      "cover_letter": "Formal cover letter accompanying the permit submission"
    };
    
    // Create enhanced document list with descriptions
    const enhancedDocumentList = Object.entries(documentByCategory)
      .map(([category, docs]) => {
        const rawCategory = Object.keys(documentDescriptions).find(
          key => formatDocumentCategory(key) === category
        ) || '';
        
        const description = documentDescriptions[rawCategory] || "Supporting documentation for the permit application";
        
        return `**${category}**:\n${description}\nFiles: ${docs.map(doc => `${doc}`).join(', ')}`;
      })
      .join('\n\n');

    const prompt = `
You are an expert permit specialist at Intralog, writing a formal cover letter for a High-Piled Storage Permit application.

Generate a professional cover letter using the following project information:

Project Name: ${project.name}
Client/Customer Name: ${project.clientName || "Our client"}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress || "the project location"}
Building Department: ${project.jurisdiction || municipality} Building Department
Building Department Address: ${project.jurisdictionAddress || "Municipal Building Department"}
Project Description: High-piled storage facility permit application

FOLLOW THIS EXACT TEMPLATE STRUCTURE:

Intralog Permit Services

${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${project.jurisdiction || municipality} Building Department  
${project.jurisdictionAddress || "Municipal Building Department"}  
${project.jurisdiction || municipality}

**Subject: High-Piled Storage Permit Application Submission for ${project.name}**

Dear ${project.jurisdiction || municipality} Plan Review Team,

I am writing on behalf of Intralog Permit Services to formally submit a High-Piled Storage Permit Application for the facility located at ${project.facilityAddress || "the project location"}.

Enclosed is a comprehensive package of documents required for high-piled storage permitting. The following is an index of the submitted items:

---

**1. Site Plan**  
This document shows the full layout of the building and the racking system in relation to surrounding areas. It includes building dimensions, fire access roads, fire hydrants, and the location of high-pile storage within the facility.  
${documentByCategory["Site Plan"] ? "*Files Submitted:* " + documentByCategory["Site Plan"].join(", ") : "*No files submitted*"}

**2. Facility Plan**  
This plan includes the layout of interior storage areas, the dimensions and orientation of racks, aisle spacing, storage heights, and locations of exits. It provides details to ensure compliance with minimum aisle and clearance requirements.  
${documentByCategory["Facility Plan"] ? "*Files Submitted:* " + documentByCategory["Facility Plan"].join(", ") : "*No files submitted*"}

**3. Egress Plan**  
The egress plan demonstrates how occupants can safely exit the facility. It includes exit paths, travel distances, door widths, and the number and location of exits, ensuring compliance with egress requirements for high-piled storage.  
${documentByCategory["Egress Plan"] ? "*Files Submitted:* " + documentByCategory["Egress Plan"].join(", ") : "*No files submitted*"}

**4. Structural Plans**  
These stamped and signed engineering documents include structural calculations and anchorage details for the racking system. They confirm compliance with seismic and load-bearing requirements.  
${documentByCategory["Structural Plans"] ? "*Files Submitted:* " + documentByCategory["Structural Plans"].join(", ") : "*No files submitted*"}

**5. Commodities Form**  
A completed high-piled storage commodity form that outlines the classification of stored materials, container types, and packaging. It includes commodity hazard levels used to determine fire protection requirements.  
${documentByCategory["Commodities Form"] ? "*Files Submitted:* " + documentByCategory["Commodities Form"].join(", ") : "*No files submitted*"}

**6. Fire Protection**  
These documents detail the existing and/or proposed fire protection systems, including sprinkler coverage, system design, and fire department access. It verifies whether the fire suppression system meets the requirements for the height and class of stored commodities.  
${documentByCategory["Fire Protection"] ? "*Files Submitted:* " + documentByCategory["Fire Protection"].join(", ") : "*No files submitted*"}

**7. Special Inspection**  
A report identifying any required special inspections for racking installation, anchorage, or other structural elements, including final inspection verification for code compliance.  
${documentByCategory["Special Inspection"] ? "*Files Submitted:* " + documentByCategory["Special Inspection"].join(", ") : "*No files submitted*"}

**8. Cover Letter**  
This letter serves as a summary and index of the included documents for easy reference by the plan reviewer.

---

For any questions or further information, please contact the Intralog Permit Services Team at:  
**Email:** permits@intralog.io  
**Phone:** (801) 441-8992

We appreciate your time and review of this application and look forward to your feedback.

Sincerely,  
Intralog Permit Services Team

Generated by PainlessPermit™ by Intralog
`;

    // At this point, we've already checked that openai is not null
    const response = await (openai as OpenAI).chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || generateTemplateCoverLetter(project, documents);
  } catch (error) {
    console.error("Error generating cover letter with AI:", error);
    return generateTemplateCoverLetter(project, documents);
  }
}

// Fallback template-based generation
function generateTemplateCoverLetter(project: any, documents: any[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Create a categorized document list
  const documentByCategory: Record<string, string[]> = {};
  
  documents.forEach(doc => {
    const category = formatDocumentCategory(doc.category);
    if (!documentByCategory[category]) {
      documentByCategory[category] = [];
    }
    documentByCategory[category].push(doc.fileName);
  });
  
  // Document descriptions map
  const documentDescriptions: Record<string, string> = {
    "site_plan": "Site plan showing the building layout, locations of exits, and fire access points",
    "facility_plan": "Detailed facility plan with dimensions and structural information",
    "egress_plan": "Plan showing all emergency exits, egress paths, and evacuation routes",
    "structural_plans": "Engineering drawings showing rack layouts and structural specifications",
    "commodities": "Documentation of stored materials, their classifications, and storage arrangements",
    "fire_protection": "Specifications for fire suppression systems and fire prevention measures",
    "special_inspection": "Reports from certified inspection authorities and compliance documentation",
    "cover_letter": "Formal cover letter accompanying the permit submission"
  };
  
  // Format document list by category with descriptions
  const formattedDocumentList = Object.entries(documentByCategory)
    .map(([category, docs]) => {
      // Find the raw category to get the description
      const rawCategory = Object.keys(documentDescriptions).find(
        key => formatDocumentCategory(key) === category
      ) || '';
      
      const description = documentDescriptions[rawCategory] || "Supporting documentation for the permit application";
      
      return `<b>${category}</b>\n${description}\nFiles: ${docs.join(', ')}`;
    })
    .join('\n\n');

  return `Intralog Permit Services

${date}

${project.jurisdiction || "Municipal"} Building Department  
${project.jurisdictionAddress || "Municipal Building Department"}  
${project.jurisdiction || "Municipal"}

**Subject: High-Piled Storage Permit Application Submission for ${project.name}**

Dear ${project.jurisdiction || "Municipal"} Plan Review Team,

I am writing on behalf of Intralog Permit Services to formally submit a High-Piled Storage Permit Application for the facility located at ${project.facilityAddress || "the project location"}.

Enclosed is a comprehensive package of documents required for high-piled storage permitting. The following is an index of the submitted items:

---

<b>1. Site Plan</b>
This document shows the full layout of the building and the racking system in relation to surrounding areas. It includes building dimensions, fire access roads, fire hydrants, and the location of high-pile storage within the facility.  
${documentByCategory["Site Plan"] ? "Files Submitted: " + documentByCategory["Site Plan"].join(", ") : "No files submitted"}

<b>2. Facility Plan</b>
This plan includes the layout of interior storage areas, the dimensions and orientation of racks, aisle spacing, storage heights, and locations of exits. It provides details to ensure compliance with minimum aisle and clearance requirements.  
${documentByCategory["Facility Plan"] ? "Files Submitted: " + documentByCategory["Facility Plan"].join(", ") : "No files submitted"}

<b>3. Egress Plan</b>
The egress plan demonstrates how occupants can safely exit the facility. It includes exit paths, travel distances, door widths, and the number and location of exits, ensuring compliance with egress requirements for high-piled storage.  
${documentByCategory["Egress Plan"] ? "Files Submitted: " + documentByCategory["Egress Plan"].join(", ") : "No files submitted"}

<b>4. Structural Plans</b>
These stamped and signed engineering documents include structural calculations and anchorage details for the racking system. They confirm compliance with seismic and load-bearing requirements.  
${documentByCategory["Structural Plans"] ? "Files Submitted: " + documentByCategory["Structural Plans"].join(", ") : "No files submitted"}

<b>5. Commodities Form</b>
A completed high-piled storage commodity form that outlines the classification of stored materials, container types, and packaging. It includes commodity hazard levels used to determine fire protection requirements.  
${documentByCategory["Commodities Form"] ? "Files Submitted: " + documentByCategory["Commodities Form"].join(", ") : "No files submitted"}

<b>6. Fire Protection</b>
These documents detail the existing and/or proposed fire protection systems, including sprinkler coverage, system design, and fire department access. It verifies whether the fire suppression system meets the requirements for the height and class of stored commodities.  
${documentByCategory["Fire Protection"] ? "Files Submitted: " + documentByCategory["Fire Protection"].join(", ") : "No files submitted"}

<b>7. Special Inspection</b>
A report identifying any required special inspections for racking installation, anchorage, or other structural elements, including final inspection verification for code compliance.  
${documentByCategory["Special Inspection"] ? "Files Submitted: " + documentByCategory["Special Inspection"].join(", ") : "No files submitted"}

<b>8. Cover Letter</b>
This letter serves as a summary and index of the included documents for easy reference by the plan reviewer.

---

For any questions or further information, please contact the Intralog Permit Services Team at:  
**Email:** permits@intralog.io  
**Phone:** (801) 441-8992

We appreciate your time and review of this application and look forward to your feedback.

Sincerely,  
Intralog Permit Services Team

Generated by PainlessPermit™ by Intralog
  `.trim();
}

function formatDocumentCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}