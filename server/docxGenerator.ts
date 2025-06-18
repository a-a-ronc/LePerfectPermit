import { Document, Packer, Paragraph, TextRun } from "docx";
import * as fs from "fs";

/**
 * Converts markdown-style bold (**text**) to a bold TextRun.
 */
function parseLineToParagraph(line: string): Paragraph {
  const trimmed = line.trim();

  // If the line is markdown bold like **1. Site Plan**
  const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
  if (boldMatch) {
    return new Paragraph({
      children: [new TextRun({ text: boldMatch[1], bold: true })],
    });
  }

  // Otherwise, just a normal paragraph
  return new Paragraph({
    children: [new TextRun({ text: line })],
  });
}

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx") {
  const lines = content.split("\n").map((line) => parseLineToParagraph(line));

  const doc = new Document({
    sections: [
      {
        children: lines,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fileName, buffer);
}
