import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx"): Promise<Buffer> {
  try {
    // Clean content by removing HTML tags, unwanted separators, and normalize filenames
    const cleanContent = content
      .replace(/<b>/g, '')
      .replace(/<\/b>/g, '')
      .replace(/---/g, '')
      .replace(/&nbsp;/g, ' ') // Remove any remaining &nbsp; entities
      .replace(/\s*\(\d+\s*copies?\)\s*/gi, '') // Remove copy quantities throughout
      .trim();

    // Helper function to check if a line is a filename
    const isFilename = (line: string): boolean => {
      return line.includes('.pdf') || line.includes('.docx') || line.includes('.xlsx') || 
             line.includes('.doc') || line.includes('.png') || line.includes('.jpg');
    };

    // Helper function to create consistent filename paragraph
    const createFilenameParagraph = (text: string): Paragraph => {
      return new Paragraph({
        children: [
          new TextRun({
            text: text.trim(),
            size: 20, // 10pt font size for ALL filenames
            font: "Times New Roman",
            bold: false,
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 90, // 0.125 inch left indent
          firstLine: 0,
        },
        spacing: {
          before: 0,
          after: 0,
        }
      });
    };

    // Split content by lines and process each line
    const lines = cleanContent.split('\n');
    const paragraphs: Paragraph[] = [];

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
                font: "Times New Roman",
              }),
            ],
            alignment: AlignmentType.LEFT,
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
                text: trimmedLine,
                size: 22, // 11pt for "Files Submitted:" headers
                font: "Times New Roman",
                bold: false,
              }),
            ],
            alignment: AlignmentType.LEFT,
          })
        );
        continue;
      }

      // ALL filename entries - use helper function for consistency
      if (trimmedLine.startsWith("    ") && isFilename(trimmedLine)) {
        paragraphs.push(createFilenameParagraph(trimmedLine));
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

      // Catch ALL remaining filename entries - use helper function
      if (isFilename(trimmedLine)) {
        paragraphs.push(createFilenameParagraph(trimmedLine));
        continue;
      }
      
      // Regular paragraph text
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 22, // 11pt
              font: "Times New Roman",
            }),
          ],
          alignment: AlignmentType.LEFT,
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