import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx"): Promise<Buffer> {
  try {
    // Clean content by removing HTML tags and unwanted separators
    const cleanContent = content
      .replace(/<b>/g, '')
      .replace(/<\/b>/g, '')
      .replace(/---/g, '')
      .trim();

    // Split content by lines and process each line
    const lines = cleanContent.split('\n');
    const paragraphs: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        // Add spacing between sections
        if (paragraphs.length > 0) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        }
        continue;
      }

      // Company header (first line) - handle both plain and bold markdown
      if ((i === 0 && trimmedLine === "Intralog Permit Services") || 
          (i === 0 && trimmedLine === "**Intralog Permit Services**")) {
        const headerText = trimmedLine.replace(/\*\*/g, ''); // Remove markdown
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: headerText,
                bold: true,
                size: 28, // 14pt
              }),
            ],
            alignment: "center",
          })
        );
        continue;
      }

      // Date line
      if (trimmedLine.includes("2025") || trimmedLine.includes("2024") || trimmedLine.includes("2026")) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: trimmedLine, size: 22 })], // 11pt
            alignment: "right",
          })
        );
        continue;
      }

      // Subject line - handle both plain and bold markdown
      if (trimmedLine.startsWith("Subject:") || trimmedLine.startsWith("RE:") || trimmedLine.startsWith("**Subject:")) {
        const subjectText = trimmedLine.replace(/^\*\*/, '').replace(/\*\*$/, ''); // Remove markdown
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subjectText,
                bold: true,
                size: 22, // 11pt
              }),
            ],
          })
        );
        continue;
      }

      // Salutation
      if (trimmedLine.startsWith("Dear ")) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: trimmedLine, size: 22 })], // 11pt
          })
        );
        continue;
      }

      // Document category lines (numbered items) - handle asterisks and make bold
      if (/^\*?\*?\d+\.\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine)) {
        // Remove all asterisks from the text
        const cleanText = trimmedLine.replace(/\*+/g, '').trim();
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanText,
                bold: true,
                size: 22, // 11pt
              }),
            ],
            alignment: "left", // Ensure left alignment
          })
        );
        continue;
      }

      // Files submitted header line
      if (trimmedLine === "Files Submitted:") {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "    " + trimmedLine, // Add indentation
                size: 20, // 10pt
              }),
            ],
            alignment: "left",
            indent: {
              left: 0,
            },
          })
        );
        continue;
      }

      // Individual file names (should be indented and left-aligned)
      if (trimmedLine.startsWith("    ") && (trimmedLine.includes(".pdf") || trimmedLine.includes(".docx") || trimmedLine.includes(".xlsx"))) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine, // Already has indentation
                size: 18, // 9pt - smaller font size for filenames
                font: "Times New Roman", // Ensure Times New Roman
              }),
            ],
            alignment: "left", // Force left alignment for ALL files including Special Inspection
            indent: {
              left: 720, // 0.5 inch left indent for filenames
            },
          })
        );
        continue;
      }

      // Contact information section - make labels bold
      if (trimmedLine.startsWith("Email:") || trimmedLine.startsWith("Phone:")) {
        const colonIndex = trimmedLine.indexOf(':');
        const label = trimmedLine.substring(0, colonIndex + 1);
        const value = trimmedLine.substring(colonIndex + 1);
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: 22, // 11pt
              }),
              new TextRun({
                text: value,
                size: 22, // 11pt
              }),
            ],
          })
        );
        continue;
      }

      // Closing - handle both plain and bold markdown for team signature
      if (trimmedLine === "Sincerely," || trimmedLine.includes("Permit Services Team") || 
          trimmedLine.includes("**Intralog Permit Services Team**")) {
        const closingText = trimmedLine.replace(/\*\*/g, ''); // Remove markdown
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: closingText,
                size: 22, // 11pt
                bold: closingText.includes("Permit Services Team"),
              }),
            ],
          })
        );
        continue;
      }

      // Footer
      if (trimmedLine.startsWith("Generated by PainlessPermit")) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                size: 18, // 9pt
                italics: true,
                color: "666666",
              }),
            ],
            alignment: "center",
          })
        );
        continue;
      }

      // Regular paragraph text
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 22, // 11pt
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720, // 1 inch
                right: 720, // 1 inch
                bottom: 720, // 1 inch
                left: 720, // 1 inch
              },
            },
          },
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