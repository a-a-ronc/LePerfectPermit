import { Document, Packer, Paragraph, TextRun } from "docx";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx"): Promise<Buffer> {
  try {
    // Split content by lines and process each line
    const lines = content.split('\n');
    const paragraphs: any[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Check if this is a document category line (starts with number and period)
      if (/^\d+\.\s/.test(trimmedLine)) {
        // This is a document category - make it bold
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
              }),
            ],
          })
        );
      } else {
        // Regular paragraph
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error generating DOCX:", error);
    throw new Error("Failed to generate Word document");
  }
}