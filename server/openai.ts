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

    const prompt = `
You are an expert permit specialist at Intralog, writing a formal cover letter for a High-Piled Storage Permit application.

Write a professional cover letter for the following project and document submission. DO NOT use placeholder text or variables like [Your Name] - use actual data or Intralog's standard information:

Project Name: ${project.name}
Customer Name: ${project.customerName || "The customer"}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress || "the specified location"}
Jurisdiction: ${project.jurisdiction || municipality}
Project Description: ${project.description || "High-piled storage facility"}

The following documents are included in this submission (organized by category):
${formattedDocumentList}

The cover letter should:
1. Be addressed to the building department of the jurisdiction/municipality specified above
2. Begin with "Dear members of ${project.jurisdiction || municipality} building department,"
3. State that you are writing on behalf of Intralog Permit Services to formally submit a permit application for the customer's project
4. Include the project name, short description, and location address
5. Mention that you're including an index of supporting documentation with descriptions
6. List all attached documents organized by category
7. For contact information, include "For any questions or further information, please contact the Intralog Permit Services Team at permits@intralog.com or (800) 555-1234."
8. Include today's date at the top (${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })})
9. Be signed from "Intralog Permit Services Team"
10. Use a professional, concise, and formal tone appropriate for government permit applications

Format the letter professionally with proper business letter formatting including date, addressee, subject line, greeting, body paragraphs, and signature.
Important: All information must be concrete and specific - no placeholder text with brackets like [Address] or [Phone].
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
  
  // Format document list by category
  const formattedDocumentList = Object.entries(documentByCategory)
    .map(([category, docs]) => {
      return `${category}:\n${docs.map(doc => `  - ${doc}`).join('\n')}`;
    })
    .join('\n\n');

  return `
${date}

Building Department
${project.jurisdiction || "Local Authority Having Jurisdiction"}

Subject: High-Piled Storage Permit Application for ${project.name}

Dear members of ${project.jurisdiction || "the local"} building department,

On behalf of ${project.customerName || "our client"}, I am writing to formally submit a permit application for the ${project.description || "high-piled storage facility"} planned for ${project.facilityAddress || "the specified location"}.

The permit application is for a high-piled storage installation with a permit tracking number of ${project.permitNumber || "to be assigned"}. We have prepared a comprehensive set of documents that meet all the requirements for this type of permit.

Please find attached the complete set of documents for the High-Piled Storage Permit application. Below you will find an index describing the application's supporting documentation:

${formattedDocumentList}

Each document has been carefully prepared to meet or exceed the requirements of your jurisdiction's building and fire codes for high-piled storage installations.

For any questions or further information, please contact the Intralog Permit Services Team at permits@intralog.com or (800) 555-1234.

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