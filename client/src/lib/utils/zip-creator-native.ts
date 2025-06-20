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
    
    // Check if we're in an iframe (like Replit)
    const isInIframe = window !== window.parent;
    
    // First try native file picker for ZIP destination (only if not in iframe)
    let zipBlob: Blob | null = null;
    
    if ('showSaveFilePicker' in window && !isInIframe) {
      try {
        // Create ZIP file first
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
        
        // Add cover letter first
        zip.file('00_Cover_Letter.txt', coverLetter);
        
        // Add each document with proper ordering
        for (let i = 0; i < sortedDocs.length; i++) {
          const doc = sortedDocs[i];
          const prefix = String(i + 1).padStart(2, '0');
          const fileName = `${prefix}_${doc.fileName}`;
          const content = base64ToUint8Array(doc.fileContent);
          zip.file(fileName, content);
        }
        
        // Generate ZIP
        zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        // Try native save picker
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: zipFileName,
          types: [{
            description: 'ZIP Archive',
            accept: { 'application/zip': ['.zip'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          z-index: 10001;
          max-width: 320px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
        `;
        notification.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="margin-right: 8px;">📦</span>
            <strong>Export Complete</strong>
          </div>
          <div style="margin-bottom: 4px;">${zipFileName}</div>
          <small style="opacity: 0.9;">${documents.length + 1} files packaged</small>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
        
        return true;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return false; // User cancelled
        }
        console.log('Native picker failed, using fallback:', error.message);
      }
    }
    
    // Fallback: Show confirmation dialog then download
    const shouldProceed = await new Promise<boolean>((resolve) => {
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
        max-width: 600px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      
      modal.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
          <div style="width: 24px; height: 24px; background: #28a745; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 14px;">📦</span>
          </div>
          <h3 style="margin: 0; color: #333; font-size: 18px;">Export Document Package</h3>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #e9ecef;">
          <div style="margin-bottom: 12px;"><strong style="color: #333;">Package Contents:</strong></div>
          <div style="margin-bottom: 8px;">📄 Cover Letter (00_Cover_Letter.txt)</div>
          <div style="margin-bottom: 8px;">📁 ${documents.length} Project Documents</div>
          <div style="font-size: 12px; color: #666; margin-top: 12px;">Files will be organized by category with numbered prefixes</div>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="color: #856404; margin-right: 8px;">⚠️</span>
            <strong style="color: #856404;">Limited Folder Selection</strong>
          </div>
          <div style="font-size: 13px; color: #856404;">
            ${isInIframe ? 'For full folder selection, open this app in a new browser tab<br>' : 'For folder selection, use Chrome/Edge in a new tab<br>'}
            ZIP file will be saved to Downloads as: <strong>${zipFileName}</strong>
          </div>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee;">
          <button id="cancel-export" style="padding: 10px 20px; background: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Cancel</button>
          <button id="create-zip" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Create ZIP Package</button>
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
    
    // Use traditional download for fallback
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      z-index: 10001;
      max-width: 320px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="margin-right: 8px;">📦</span>
        <strong>Export Complete</strong>
      </div>
      <div style="margin-bottom: 4px;">${zipFileName}</div>
      <small style="opacity: 0.9;">Saved to Downloads folder</small>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
    
    return true;
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