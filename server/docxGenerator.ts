import { Document, Packer, Paragraph, TextRun } from "docx";
import * as fs from "fs";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx"): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: content.split("\n").map(line => 
          new Paragraph({
            children: [new TextRun({ text: line })]
          })
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  
  // Optional: Save to file system if needed for debugging
  // fs.writeFileSync(fileName, buffer);
  
  return buffer;
}