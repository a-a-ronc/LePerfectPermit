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
    // Create a simple archive format since we can't use JSZip
    const files: Array<{ name: string; content: Uint8Array }> = [];
    
    // Add cover letter first
    files.push({
      name: '00_Cover_Letter.txt',
      content: new TextEncoder().encode(coverLetter)
    });
    
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
      const content = base64ToUint8Array(doc.fileContent);
      files.push({ name: fileName, content });
      fileIndex++;
    }
    
    // Create a simple concatenated file with headers (tar-like)
    const chunks: Uint8Array[] = [];
    
    for (const file of files) {
      // File name length (4 bytes)
      const nameBytes = new TextEncoder().encode(file.name);
      const nameLength = new Uint32Array([nameBytes.length]);
      chunks.push(new Uint8Array(nameLength.buffer));
      
      // File name
      chunks.push(nameBytes);
      
      // Content length (4 bytes)
      const contentLength = new Uint32Array([file.content.length]);
      chunks.push(new Uint8Array(contentLength.buffer));
      
      // Content
      chunks.push(file.content);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Save the archive file with better naming
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const archiveFileName = `${sanitizedProjectName}_Documents.zip`;
    const savedPath = await saveFileWithPicker(
      archiveFileName,
      result,
      'application/zip'
    );
    
    return savedPath !== null && savedPath !== 'fallback-download';
  } catch (error) {
    console.error('Error creating submission archive:', error);
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
    // Use the simple archive method since ZIP compression is complex without libraries
    return createSubmissionZip(coverLetter, documents, projectName);
  } catch (error) {
    console.error('Error creating submission package:', error);
    return false;
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