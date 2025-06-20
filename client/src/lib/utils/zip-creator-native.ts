import JSZip from 'jszip';
import { saveFileWithPicker } from './file-download';

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Create proper ZIP file with JSZip
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
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    // First, show file picker dialog for ZIP file location
    const zipFileName = `${sanitizedProjectName}_Documents.zip`;
    
    const shouldProceed = await new Promise<boolean>((resolve) => {
      // Create file picker dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      
      modal.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #333;">Export Document Package</h3>
        <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">Create compressed ZIP file containing ${documents.length + 1} documents:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Package Contents:</strong><br>
          • Cover Letter (00_Cover_Letter.txt)<br>
          • ${documents.length} Project Documents<br>
          <small style="color: #666;">Files will be organized by category with numbered prefixes</small>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
          <button id="cancel-export" style="padding: 8px 16px; background: #f5f5f5; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
          <button id="create-zip" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Create ZIP Package</button>
        </div>
      `;
      
      const cancelButton = modal.querySelector('#cancel-export') as HTMLButtonElement;
      const createButton = modal.querySelector('#create-zip') as HTMLButtonElement;
      
      cancelButton.onclick = () => {
        document.body.removeChild(dialog);
        resolve(false);
      };
      
      createButton.onclick = () => {
        document.body.removeChild(dialog);
        resolve(true);
      };
      
      dialog.appendChild(modal);
      document.body.appendChild(dialog);
    });
    
    if (!shouldProceed) {
      return false; // User cancelled
    }
    
    // Show progress dialog
    const progressDialog = document.createElement('div');
    progressDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 24px;
      z-index: 10001;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
    `;
    
    progressDialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Creating ZIP Package</h3>
      <p style="margin: 0 0 16px 0; color: #666;">Processing ${documents.length + 1} files...</p>
      <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
        <div id="zip-progress-bar" style="height: 100%; background: #28a745; width: 0%; transition: width 0.3s;"></div>
      </div>
      <p id="progress-text" style="margin: 16px 0 0 0; font-size: 12px; color: #999;">Initializing...</p>
    `;
    
    document.body.appendChild(progressDialog);
    
    const progressBar = progressDialog.querySelector('#zip-progress-bar') as HTMLElement;
    const progressText = progressDialog.querySelector('#progress-text') as HTMLElement;
    
    // Create JSZip instance
    const zip = new JSZip();
    
    // Sort documents by category order
    const categoryOrder = [
      'site_plan', 'facility_plan', 'egress_plan',
      'special_inspection', 'structural_analysis', 
      'fire_protection', 'other'
    ];
    
    const sortedDocs = documents.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      return a.fileName.localeCompare(b.fileName);
    });
    
    let processed = 0;
    const total = sortedDocs.length + 1;
    
    // Add cover letter first
    progressText.textContent = 'Adding cover letter...';
    zip.file('00_Cover_Letter.txt', coverLetter);
    processed++;
    progressBar.style.width = `${(processed / total) * 100}%`;
    
    // Add each document with proper ordering
    for (let i = 0; i < sortedDocs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for UI updates
      
      const doc = sortedDocs[i];
      const prefix = String(i + 1).padStart(2, '0');
      const fileName = `${prefix}_${doc.fileName}`;
      
      progressText.textContent = `Adding ${doc.fileName}...`;
      
      try {
        const content = base64ToUint8Array(doc.fileContent);
        zip.file(fileName, content);
        processed++;
        progressBar.style.width = `${(processed / total) * 100}%`;
      } catch (error) {
        console.error(`Error adding file ${doc.fileName}:`, error);
        // Continue with other files
        processed++;
        progressBar.style.width = `${(processed / total) * 100}%`;
      }
    }
    
    // Generate ZIP file
    progressText.textContent = 'Generating ZIP file...';
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    progressText.textContent = 'Saving file...';
    
    // Convert blob to Uint8Array for our file picker
    const arrayBuffer = await zipBlob.arrayBuffer();
    const zipContent = new Uint8Array(arrayBuffer);
    
    // Remove progress dialog
    document.body.removeChild(progressDialog);
    
    // Use our file picker to save the ZIP
    const savedPath = await saveFileWithPicker(
      zipFileName,
      zipContent,
      'application/zip'
    );
    
    return savedPath !== null;
  } catch (error) {
    console.error('Error creating ZIP package:', error);
    
    // Remove progress dialog if it exists
    const existingDialog = document.querySelector('[id*="zip-progress"]')?.closest('div');
    if (existingDialog && existingDialog.parentNode) {
      existingDialog.parentNode.removeChild(existingDialog);
    }
    
    return false;
  }
}