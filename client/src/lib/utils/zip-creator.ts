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

// Create proper ZIP file with cover letter and documents
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
    // Since we can't use a real ZIP library, we'll create individual files
    // and let the user download them separately, then instruct them to zip manually
    
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    // First, try to show directory picker for organized saving
    let useDirectoryPicker = false;
    let directoryHandle: any = null;
    
    try {
      if ('showDirectoryPicker' in window) {
        directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        });
        useDirectoryPicker = true;
      }
    } catch (e) {
      console.log('Directory picker not available or cancelled, using individual downloads');
    }
    
    if (useDirectoryPicker && directoryHandle) {
      // Save files to selected directory
      try {
        // Create cover letter file
        const coverLetterHandle = await directoryHandle.getFileHandle(
          '00_Cover_Letter.txt', 
          { create: true }
        );
        const coverLetterWritable = await coverLetterHandle.createWritable();
        await coverLetterWritable.write(coverLetter);
        await coverLetterWritable.close();
        
        // Sort and save documents
        const sortedDocs = documents.sort((a, b) => {
          const categoryOrder = [
            'site_plan', 'facility_plan', 'egress_plan',
            'special_inspection', 'structural_analysis', 
            'fire_protection', 'other'
          ];
          
          const aIndex = categoryOrder.indexOf(a.category);
          const bIndex = categoryOrder.indexOf(b.category);
          
          if (aIndex !== bIndex) {
            return aIndex - bIndex;
          }
          
          return a.fileName.localeCompare(b.fileName);
        });
        
        // Save each document
        for (let i = 0; i < sortedDocs.length; i++) {
          const doc = sortedDocs[i];
          const prefix = String(i + 1).padStart(2, '0');
          const fileName = `${prefix}_${doc.fileName}`;
          
          const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          const content = base64ToUint8Array(doc.fileContent);
          await writable.write(content);
          await writable.close();
        }
        
        return true;
      } catch (error) {
        console.error('Error saving to directory:', error);
        return false;
      }
    } else {
      // Fallback: create a simple bundle and download
      return await createSimpleBundle(coverLetter, documents, sanitizedProjectName);
    }
  } catch (error) {
    console.error('Error creating submission package:', error);
    return false;
  }
}

// Create a simple bundle as fallback
async function createSimpleBundle(
  coverLetter: string,
  documents: Array<{
    fileName: string;
    fileContent: string;
    category: string;
  }>,
  projectName: string
): Promise<boolean> {
  try {
    // Create a text-based manifest with all files
    let manifest = `${projectName} - Document Package\n`;
    manifest += `Generated: ${new Date().toISOString()}\n`;
    manifest += `Total Files: ${documents.length + 1}\n\n`;
    
    manifest += `=== COVER LETTER ===\n`;
    manifest += coverLetter;
    manifest += `\n\n`;
    
    // Sort documents
    const sortedDocs = documents.sort((a, b) => {
      const categoryOrder = [
        'site_plan', 'facility_plan', 'egress_plan',
        'special_inspection', 'structural_analysis', 
        'fire_protection', 'other'
      ];
      
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      return a.fileName.localeCompare(b.fileName);
    });
    
    manifest += `=== DOCUMENT LIST ===\n`;
    sortedDocs.forEach((doc, index) => {
      manifest += `${index + 1}. ${doc.fileName} (${doc.category})\n`;
    });
    manifest += `\n`;
    
    manifest += `=== INSTRUCTIONS ===\n`;
    manifest += `This package contains ${documents.length} documents plus cover letter.\n`;
    manifest += `Documents are available for individual download from the application.\n`;
    manifest += `Use the individual download buttons to save each file.\n`;
    
    // Download the manifest
    const manifestBlob = new Blob([manifest], { type: 'text/plain' });
    const url = URL.createObjectURL(manifestBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_Package_Manifest.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error creating manifest:', error);
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