import { Document, Packer, Paragraph, TextRun } from "docx";
import * as fs from "fs";

export async function generateCoverLetterDocx(content: string, fileName: string = "CoverLetter.docx") {
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
  fs.writeFileSync(fileName, buffer);
}
