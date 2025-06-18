import { Document, Packer, Paragraph, TextRun } from "docx";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx"): Promise<Buffer> {
  // Parse content to create formatted paragraphs with bold text for document categories
  const lines = content.split("\n");
  const paragraphs = lines.map(line => {
    // Check if line contains numbered document categories (1. Site Plan, 2. Facility Plan, etc.)
    const categoryMatch = line.match(/^(\d+\.\s+)(.+)$/);
    
    if (categoryMatch) {
      const [, number, category] = categoryMatch;
      return new Paragraph({
        children: [
          new TextRun({ text: number }),
          new TextRun({ text: category, bold: true })
        ]
      });
    }
    
    // Check for subject line
    if (line.includes("Subject:")) {
      return new Paragraph({
        children: [new TextRun({ text: line, bold: true })]
      });
    }
    
    // Regular paragraphs
    return new Paragraph({
      children: [new TextRun({ text: line })]
    });
  });

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}