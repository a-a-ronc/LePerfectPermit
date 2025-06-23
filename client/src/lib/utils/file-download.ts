// File download utilities with persistent path memory

const LAST_DOWNLOAD_PATH_KEY = 'lastDownloadPath';
const LAST_UPLOAD_PATH_KEY = 'lastUploadPath';

export interface FileSystemDirectoryHandle {
  name: string;
  kind: 'directory';
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

export interface FileSystemFileHandle {
  name: string;
  kind: 'file';
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window;
}

// Enhanced file picker with native API and comprehensive fallback
export async function saveFileWithPicker(
  fileName: string, 
  content: string | Uint8Array, 
  mimeType: string
): Promise<string | null> {
  // Check for iframe restrictions first
  const isInIframe = window !== window.parent;
  
  // Try native File System Access API (only if not in iframe and API exists)
  if ('showSaveFilePicker' in window && !isInIframe) {
    try {
      const fileExtension = fileName.split('.').pop() || '';
      const options: any = {
        suggestedName: fileName,
        types: [{
          description: `${fileExtension.toUpperCase()} Files`,
          accept: {
            [mimeType]: [`.${fileExtension}`]
          }
        }]
      };

      const fileHandle = await (window as any).showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();
      
      if (typeof content === 'string') {
        await writable.write(content);
      } else {
        await writable.write(content);
      }
      await writable.close();

      showDownloadNotification(fileName, 'Selected location');
      return fileHandle.name;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null; // User cancelled
      }
      console.log('Native file picker failed:', error.message);
    }
  }

  // Show browser compatibility notice and enhanced file selector
  return new Promise((resolve) => {
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
      max-width: 650px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.value = fileName;
    pathInput.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      margin: 12px 0;
      box-sizing: border-box;
      font-family: monospace;
    `;
    
    // Check browser compatibility for better messaging
    const isChromium = 'showSaveFilePicker' in window;
    const browserAdvice = isChromium 
      ? "For full folder selection, open this app in a new tab (not embedded)"
      : "For full folder selection, use Chrome, Edge, or another Chromium-based browser";
    
    modal.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
        <div style="width: 24px; height: 24px; background: #007bff; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 14px;">💾</span>
        </div>
        <h3 style="margin: 0; color: #333; font-size: 18px;">Save File</h3>
      </div>
      
      ${isInIframe ? `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="color: #856404; margin-right: 8px;">⚠️</span>
          <strong style="color: #856404;">Limited File Access</strong>
        </div>
        <div style="font-size: 13px; color: #856404;">
          ${browserAdvice}<br>
          File will be saved to your default Downloads folder
        </div>
      </div>
      ` : ''}
      
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e9ecef;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 16px; color: #6c757d; margin-right: 8px;">📂</span>
          <span style="font-size: 14px; color: #495057; font-family: monospace;">~/Downloads/</span>
        </div>
        <div style="font-size: 12px; color: #6c757d;">
          File will be saved to your Downloads folder with the name below
        </div>
      </div>
      
      <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500;">
        File name:
      </label>
    `;
    
    modal.appendChild(pathInput);
    
    // Add instructions for better UX
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      background: #e7f3ff;
      border: 1px solid #b3d9ff;
      padding: 12px;
      border-radius: 6px;
      margin: 16px 0;
      font-size: 12px;
      color: #004085;
    `;
    instructions.innerHTML = `
      <strong>💡 Tip:</strong> After download, you can move the file to your desired project folder using your file manager
    `;
    modal.appendChild(instructions);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      background: #f8f9fa;
      color: #6c757d;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Download to Downloads';
    saveButton.style.cssText = `
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    `;
    
    // Add hover effects
    cancelButton.onmouseenter = () => cancelButton.style.backgroundColor = '#e9ecef';
    cancelButton.onmouseleave = () => cancelButton.style.backgroundColor = '#f8f9fa';
    saveButton.onmouseenter = () => saveButton.style.backgroundColor = '#0056b3';
    saveButton.onmouseleave = () => saveButton.style.backgroundColor = '#007bff';
    
    cancelButton.onclick = () => {
      document.body.removeChild(dialog);
      resolve(null);
    };
    
    saveButton.onclick = () => {
      const finalFileName = pathInput.value.trim() || fileName;
      downloadFileTraditional(finalFileName, content, mimeType);
      showDownloadNotification(finalFileName, 'Downloads folder');
      document.body.removeChild(dialog);
      resolve(finalFileName);
    };
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    modal.appendChild(buttonContainer);
    dialog.appendChild(modal);
    document.body.appendChild(dialog);
    
    // Focus and select filename without extension
    pathInput.focus();
    const lastDotIndex = pathInput.value.lastIndexOf('.');
    if (lastDotIndex > 0) {
      pathInput.setSelectionRange(0, lastDotIndex);
    }
  });
}

// Show download notification
function showDownloadNotification(fileName: string, location: string) {
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
  
  // Create elements safely using DOM methods instead of innerHTML
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';
  
  const checkSpan = document.createElement('span');
  checkSpan.style.marginRight = '8px';
  checkSpan.textContent = '✅'; // Use textContent to prevent XSS
  
  const titleStrong = document.createElement('strong');
  titleStrong.textContent = 'File Downloaded'; // Use textContent to prevent XSS
  
  headerDiv.appendChild(checkSpan);
  headerDiv.appendChild(titleStrong);
  
  const fileNameDiv = document.createElement('div');
  fileNameDiv.style.cssText = 'margin-bottom: 4px; word-break: break-all;';
  fileNameDiv.textContent = fileName; // Use textContent to prevent XSS
  
  const locationSmall = document.createElement('small');
  locationSmall.style.opacity = '0.9';
  locationSmall.textContent = `Saved to: ${location}`; // Use textContent to prevent XSS
  
  notification.appendChild(headerDiv);
  notification.appendChild(fileNameDiv);
  notification.appendChild(locationSmall);
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Traditional download fallback
function downloadFileTraditional(
  fileName: string, 
  content: string | Uint8Array, 
  mimeType: string
): void {
  let blob: Blob;
  
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: mimeType });
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Show directory picker for uploads
export async function showUploadDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!isFileSystemAccessSupported()) {
      return null;
    }

    const lastPath = localStorage.getItem(LAST_UPLOAD_PATH_KEY);
    const options: any = {
      mode: 'read'
    };

    if (lastPath) {
      options.startIn = lastPath;
    }

    const dirHandle = await (window as any).showDirectoryPicker(options);
    localStorage.setItem(LAST_UPLOAD_PATH_KEY, dirHandle.name);
    return dirHandle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null; // User cancelled
    }
    console.error('Error showing directory picker:', error);
    return null;
  }
}

// Convert base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Download document with file picker
export async function downloadDocument(
  fileName: string,
  fileContent: string,
  mimeType: string
): Promise<boolean> {
  try {
    // Handle the case where fileContent might be null/undefined (from list view)
    if (!fileContent) {
      console.warn('No file content available for download');
      return false;
    }
    
    const content = base64ToUint8Array(fileContent);
    const savedPath = await saveFileWithPicker(fileName, content, mimeType);
    return savedPath !== null;
  } catch (error) {
    console.error('Error downloading document:', error);
    return false;
  }
}