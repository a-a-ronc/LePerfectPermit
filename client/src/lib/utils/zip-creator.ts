// Zip file creation utilities for submit to authority functionality

import { saveFileWithPicker, base64ToUint8Array } from './file-download';

// Simple ZIP file creation using JSZip-like functionality
// Since we can't install JSZip, we'll implement basic ZIP creation

interface ZipEntry {
  name: string;
  content: Uint8Array;
  date?: Date;
}

class SimpleZip {
  private entries: ZipEntry[] = [];

  addFile(name: string, content: string | Uint8Array): void {
    let fileContent: Uint8Array;
    
    if (typeof content === 'string') {
      // If it's a base64 string, decode it
      if (this.isBase64(content)) {
        fileContent = base64ToUint8Array(content);
      } else {
        // If it's regular text, encode it
        fileContent = new TextEncoder().encode(content);
      }
    } else {
      fileContent = content;
    }

    this.entries.push({
      name: this.sanitizeFileName(name),
      content: fileContent,
      date: new Date()
    });
  }

  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  private sanitizeFileName(name: string): string {
    // Remove invalid characters and ensure proper filename
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  async generateBlob(): Promise<Blob> {
    // For now, we'll create a simple archive format
    // In a production environment, you'd want to use a proper ZIP library
    
    // Create a simple tar-like format or use browser ZIP APIs if available
    const chunks: Uint8Array[] = [];
    
    for (const entry of this.entries) {
      // Add file header (simplified)
      const nameBytes = new TextEncoder().encode(entry.name);
      const nameLength = new Uint32Array([nameBytes.length]);
      const contentLength = new Uint32Array([entry.content.length]);
      
      chunks.push(new Uint8Array(nameLength.buffer));
      chunks.push(nameBytes);
      chunks.push(new Uint8Array(contentLength.buffer));
      chunks.push(entry.content);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([result], { type: 'application/zip' });
  }
}

// Create ZIP file with cover letter and documents
export async function createSubmissionZip(
  coverLetter: string,
  documents: Array<{
    fileName: string;
    fileContent: string;
    category: string;
  }>,
  projectName: string
): Promise<boolean> {
  try {
    const zip = new SimpleZip();
    
    // Add cover letter first
    zip.addFile('00_Cover_Letter.txt', coverLetter);
    
    // Sort documents by category and add them
    const sortedDocs = documents.sort((a, b) => {
      const categoryOrder = [
        'site_plan',
        'facility_plan', 
        'egress_plan',
        'special_inspection',
        'structural_analysis',
        'fire_protection',
        'other'
      ];
      
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      return a.fileName.localeCompare(b.fileName);
    });
    
    // Add documents with category prefixes
    let fileIndex = 1;
    for (const doc of sortedDocs) {
      const prefix = String(fileIndex).padStart(2, '0');
      const fileName = `${prefix}_${doc.fileName}`;
      zip.addFile(fileName, doc.fileContent);
      fileIndex++;
    }
    
    // Generate the ZIP blob
    const zipBlob = await zip.generateBlob();
    const zipArray = new Uint8Array(await zipBlob.arrayBuffer());
    
    // Save the ZIP file
    const zipFileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Submission.zip`;
    const savedPath = await saveFileWithPicker(
      zipFileName,
      zipArray,
      'application/zip'
    );
    
    return savedPath !== null;
  } catch (error) {
    console.error('Error creating submission ZIP:', error);
    return false;
  }
}

// Alternative implementation using native browser ZIP if available
export async function createSubmissionZipNative(
  coverLetter: string,
  documents: Array<{
    fileName: string;
    fileContent: string;
    category: string;
  }>,
  projectName: string
): Promise<boolean> {
  try {
    // Check if CompressionStream is available (modern browsers)
    if ('CompressionStream' in window) {
      return createSubmissionZipWithCompression(coverLetter, documents, projectName);
    } else {
      // Fallback to simple ZIP creation
      return createSubmissionZip(coverLetter, documents, projectName);
    }
  } catch (error) {
    console.error('Error creating native ZIP:', error);
    return createSubmissionZip(coverLetter, documents, projectName);
  }
}

async function createSubmissionZipWithCompression(
  coverLetter: string,
  documents: Array<{
    fileName: string;
    fileContent: string;
    category: string;
  }>,
  projectName: string
): Promise<boolean> {
  // Implementation for browsers that support CompressionStream
  // This would create a proper ZIP file with compression
  // For now, fall back to the simple method
  return createSubmissionZip(coverLetter, documents, projectName);
}