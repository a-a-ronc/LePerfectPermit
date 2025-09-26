import PDFDocument from 'pdfkit';

/**
 * Sanitizes input content to ensure no placeholder variables remain
 * @param content The text content to sanitize
 * @returns Sanitized content with placeholders replaced with generic text
 */
function sanitizeContent(content: string): string {
  // Check for common placeholder patterns like [Name], [Address], etc.
  const placeholderPattern = /\[(.*?)\]/g;
  
  // Replace placeholders with appropriate default values
  const sanitized = content.replace(placeholderPattern, (match) => {
    const placeholder = match.toLowerCase();
    
    if (placeholder.includes('name') || placeholder.includes('contact')) {
      return 'Intralog Permit Services Team';
    } else if (placeholder.includes('address')) {
      return '123 Permit Way, Suite 100';
    } else if (placeholder.includes('city') || placeholder.includes('state') || placeholder.includes('zip')) {
      return 'Phoenix, AZ 85001';
    } else if (placeholder.includes('email')) {
      return 'permits@intralog.com';
    } else if (placeholder.includes('phone')) {
      return '(800) 555-1234';
    } else if (placeholder.includes('date')) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } else {
      // For any other placeholders, use a generic replacement
      return 'Intralog Permit Services';
    }
  });
  
  return sanitized;
}

/**
 * Generates a PDF document from the provided cover letter content
 * 
 * @param content The text content for the cover letter
 * @returns Base64 string of the generated PDF
 */
export async function generatePdfFromText(content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize the content first to remove any placeholders
      const sanitizedContent = sanitizeContent(content);
      
      // Create a PDF document
      const doc = new PDFDocument({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        info: {
          Title: 'High-Piled Storage Permit Cover Letter',
          Author: 'Intralog Permit Services',
          Subject: 'Permit Application Cover Letter',
          Keywords: 'permit, high-piled storage, application'
        }
      });
      
      // Buffer to store PDF data
      const buffers: Buffer[] = [];
      
      // Collect PDF data chunks
      doc.on('data', (buffer: Buffer) => buffers.push(buffer));
      
      // When PDF is complete, combine chunks and resolve with base64
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        const base64Data = pdfData.toString('base64');
        resolve(base64Data);
      });
      
      // Add Intralog header/logo
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Intralog Permit Services', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text('High-Piled Storage Permit Application', { align: 'center' });
      doc.moveDown(2);
      
      // Process the content line by line for better formatting
      const lines = sanitizedContent.split('\n');
      
      let inDocumentList = false;
      let isFirstLine = true;
      
      // Format each line appropriately
      lines.forEach((line, index) => {
        // Reset font for each line
        doc.font('Helvetica').fontSize(10);
        
        // If this is a blank line, add some space
        if (line.trim() === '') {
          doc.moveDown(0.5);
          return;
        }
        
        // Check if this looks like a date at the top (first non-empty line)
        if (isFirstLine && /^\w+ \d+, \d{4}$/.test(line.trim())) {
          doc.text(line, { align: 'left' });
          isFirstLine = false;
          doc.moveDown(1);
          return;
        }
        isFirstLine = false;
        
        // Subject line detection
        if (line.startsWith('Subject:')) {
          doc.font('Helvetica-Bold').fontSize(11);
          doc.text(line.trim());
          doc.moveDown(1);
          return;
        }
        
        // Greeting/salutation detection
        if (line.startsWith('Dear ')) {
          doc.text(line.trim());
          doc.moveDown(1);
          return;
        }
        
        // Document list detected
        if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+:$/) || 
            line.match(/^[A-Z][a-z]+:$/) ||
            (line.includes(':') && line.split(':')[0].toUpperCase() === line.split(':')[0])) {
          inDocumentList = true;
          doc.font('Helvetica-Bold');
          doc.text(line.trim());
          doc.moveDown(0.5);
          return;
        }
        
        // Document list item
        if (inDocumentList && (line.trim().startsWith('-') || line.trim().startsWith('•') || line.startsWith('  -'))) {
          doc.font('Helvetica');
          doc.text(line.trim(), { indent: 20 });
          doc.moveDown(0.25);
          return;
        }
        
        // Exit document list mode after a blank line
        if (inDocumentList && line.trim() === '') {
          inDocumentList = false;
        }
        
        // Check for closing ("Sincerely,")
        if (line.trim() === 'Sincerely,' || line.trim() === 'Regards,' || line.trim() === 'Respectfully,') {
          doc.moveDown(0.5);
          doc.text(line.trim());
          doc.moveDown(1);
          return;
        }
        
        // Check for signature line
        if (line.includes('Permit Services Team') || line.includes('Services Team')) {
          doc.font('Helvetica-Bold');
          doc.text(line.trim());
          doc.moveDown(0.5);
          return;
        }
        
        // Regular paragraph text
        doc.text(line.trim(), { 
          align: 'left',
          lineGap: 2
        });
        
        // Add a bit of space after paragraphs
        if (line.trim().length > 0 && index < lines.length - 1 && lines[index + 1].trim() === '') {
          doc.moveDown(0.5);
        }
      });
      
      // Add Intralog footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#888888');
      doc.text('Generated by PainlessPermit™ by Intralog', {
        align: 'center'
      });
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Create a simple error PDF instead of failing completely
      try {
        const errorDoc = new PDFDocument();
        const errorBuffers: Buffer[] = [];
        
        errorDoc.on('data', (buffer: Buffer) => errorBuffers.push(buffer));
        
        errorDoc.on('end', () => {
          const pdfData = Buffer.concat(errorBuffers);
          const base64Data = pdfData.toString('base64');
          resolve(base64Data);
        });
        
        errorDoc.fontSize(16).font('Helvetica-Bold');
        errorDoc.text('Intralog Permit Services', { align: 'center' });
        errorDoc.moveDown();
        
        errorDoc.fontSize(14);
        errorDoc.text('Cover Letter (Error Recovery Version)', { align: 'center' });
        errorDoc.moveDown(2);
        
        errorDoc.fontSize(12).font('Helvetica');
        errorDoc.text('There was an error formatting the original cover letter into a PDF document.', { align: 'left' });
        errorDoc.moveDown();
        
        errorDoc.text('Below is the plain text version of the cover letter:', { align: 'left' });
        errorDoc.moveDown(2);
        
        errorDoc.fontSize(10);
        errorDoc.text(content, { align: 'left' });
        
        errorDoc.moveDown(2);
        errorDoc.fontSize(8).fillColor('#888888');
        errorDoc.text('Generated by PainlessPermit™ by Intralog', { align: 'center' });
        
        errorDoc.end();
      } catch (fallbackError) {
        // If even the error PDF fails, reject with the original error
        reject(error);
      }
    }
  });
}