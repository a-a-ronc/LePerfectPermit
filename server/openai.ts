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

    const documentList = documents
      .map((doc) => `- ${formatDocumentCategory(doc.category)}: ${doc.fileName}`)
      .join("\n");

    const prompt = `
You are an expert permit specialist at Intralog, writing a cover letter for a High-Piled Storage Permit application.

Write a professional cover letter for the following project and document submission:

Project: ${project.name}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress}
Jurisdiction: ${project.jurisdiction || municipality}

The following documents are included in this submission:
${documentList}

The cover letter should:
1. Be addressed to the jurisdiction/municipality
2. Reference the project name and permit number
3. Briefly explain that this is a High-Piled Storage Permit application
4. List all the attached documents
5. Provide contact information for further inquiries
6. Be signed from "Intralog Permit Services Team" with the current date

Format the letter professionally and make it concise (max 350 words).
`;

    // At this point, we've already checked that openai is not null
    const response = await (openai as OpenAI).chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
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

  const documentList = documents
    .map((doc) => `- ${formatDocumentCategory(doc.category)}: ${doc.fileName}`)
    .join("\n");

  return `
Cover Letter - High-Piled Storage Permit Application
${date}

To: ${project.jurisdiction || "Local Authority Having Jurisdiction"}
Re: High-Piled Storage Permit for ${project.name}
Permit Number: ${project.permitNumber || "To be assigned"}
Facility Address: ${project.facilityAddress}

To Whom It May Concern:

Please find attached the complete set of documents for the High-Piled Storage Permit application for ${
    project.name
  }. 

The following documents are included in this submission:

${documentList}

If you require any additional information or clarification, please contact us at your earliest convenience.

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