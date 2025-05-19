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

Write a professional cover letter for the following project and document submission:

Project Name: ${project.name}
Client/Customer Name: ${project.clientName || "Our client"}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress || "the project location"}
Building Department: ${project.jurisdiction || municipality} Building Department
Building Department Address: ${project.jurisdictionAddress || "Municipal Building Department"}
Project Description: High-piled storage facility permit application

The following documents are included in this submission:
${enhancedDocumentList}

USE THIS EXACT STRUCTURE:
1. Start with today's date (${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })})
2. Building Department address block (use the Building Department Address provided above, not the Facility Address)
3. Subject line: "High-Piled Storage Permit Application Submission for Project ${project.name}"
4. Greeting: "Dear ${project.jurisdiction || municipality} Building Department,"
5. First paragraph: "I am writing on behalf of Intralog Permit Services to formally submit a High-Piled Storage Permit application for our customer, ${project.clientName || "our client"}, regarding their project, ${project.name}. This project involves the development of a high-piled storage facility located at ${project.facilityAddress || "the project location"}."
6. Second paragraph: "Please find attached the following documents that comprise our complete submittal package:"
7. List each document category in bold followed by its description and the filename(s)
8. Closing paragraph with contact information: "Should you have any questions or require additional information regarding this submission, please contact the Intralog Permit Services Team at permits@intralog.com or (800) 555-1234."
9. End with "Sincerely," and "Intralog Permit Services Team"

IMPORTANT INSTRUCTION: 
- Use exact information provided without placeholders
- Format document categories in bold with their descriptions below each
- List the documents in the same order as shown in the document list
- The letter should be addressed to the Building Department Address, NOT the Facility Address
- The first few lines of the letter after the date should be the Building Department name and address exactly as provided
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
      
      return `**${category}**:\n${description}\nFiles: ${docs.join(', ')}`;
    })
    .join('\n\n');

  return `${date}

${project.jurisdiction || "Municipal"} Building Department
${project.jurisdictionAddress || "Municipal Government Center"}

Subject: High-Piled Storage Permit Application Submission for Project ${project.name}

Dear ${project.jurisdiction || "Municipal"} Building Department,

I am writing on behalf of Intralog Permit Services to formally submit a High-Piled Storage Permit application for our customer, ${project.clientName || "our client"}, regarding their project, ${project.name}. This project involves the development of a high-piled storage facility located at ${project.facilityAddress || "the project location"}.

Please find attached the following documents that comprise our complete submittal package:

${formattedDocumentList}

Each document has been prepared in accordance with local building codes and high-piled storage regulations. The documentation provides comprehensive details about the project's design, safety measures, and compliance with all applicable standards.

Should you have any questions or require additional information regarding this submission, please contact the Intralog Permit Services Team at permits@intralog.com or (800) 555-1234.

Sincerely,

Intralog Permit Services Team
  `.trim();
}

function formatDocumentCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}