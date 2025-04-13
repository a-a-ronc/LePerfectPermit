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

Write a professional cover letter for the following project and document submission:

Project Name: ${project.name}
Customer Name: ${project.customerName || "The customer"}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress || "the specified location"}
Jurisdiction: ${project.jurisdiction || municipality}
Project Description: ${project.description || "High-piled storage facility"}

The following documents are included in this submission (organized by category):
${formattedDocumentList}

The cover letter should:
1. Be addressed to the building department of the jurisdiction/municipality
2. Begin with "Dear members of [municipality name] building department,"
3. State that you are formally submitting a permit application on behalf of the customer
4. Include the project name, short description, and location address
5. Mention that you're including an index of supporting documentation with descriptions
6. List all attached documents organized by category
7. Provide contact information for further inquiries (use Intralog Permit Services as the contact)
8. Be signed from "Intralog Permit Services Team" with the current date
9. Use a professional, concise, and formal tone appropriate for government permit applications

Format the letter professionally with proper business letter formatting including date, addressee, subject line, greeting, body, and signature.
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

On behalf of ${project.customerName || "our client"}, we are formally submitting a permit application for the ${project.description || "high-piled storage facility"} planned for ${project.facilityAddress || "the specified location"}.

Please find attached the complete set of documents for the High-Piled Storage Permit application. Below you will find an index describing the application's supporting documentation:

${formattedDocumentList}

Permit Number: ${project.permitNumber || "To be assigned"}

If you require any additional information or clarification, please contact the Intralog Permit Services Team at (800) 555-0123 or permits@intralog.com.

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