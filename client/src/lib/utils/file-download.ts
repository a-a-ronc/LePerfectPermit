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

// Show file picker dialog for user to select save location
export async function saveFileWithPicker(
  fileName: string, 
  content: string | Uint8Array, 
  mimeType: string
): Promise<string | null> {
  return new Promise((resolve) => {
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
    
    // Create file path input
    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.value = fileName;
    pathInput.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      margin: 16px 0;
      box-sizing: border-box;
    `;
    
    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Save File</h3>
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Choose filename and location:</p>
    `;
    
    modal.appendChild(pathInput);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: #f5f5f5;
      color: #333;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save to Downloads';
    saveButton.style.cssText = `
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    cancelButton.onclick = () => {
      document.body.removeChild(dialog);
      resolve(null);
    };
    
    saveButton.onclick = () => {
      const finalFileName = pathInput.value || fileName;
      downloadFileTraditional(finalFileName, content, mimeType);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10001;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      `;
      notification.innerHTML = `
        <strong>File Saved:</strong><br>
        ${finalFileName}<br>
        <small>Saved to Downloads folder</small>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
      
      document.body.removeChild(dialog);
      resolve(finalFileName);
    };
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    modal.appendChild(buttonContainer);
    dialog.appendChild(modal);
    document.body.appendChild(dialog);
    
    // Focus the input and select the filename part
    pathInput.focus();
    const lastDotIndex = pathInput.value.lastIndexOf('.');
    if (lastDotIndex > 0) {
      pathInput.setSelectionRange(0, lastDotIndex);
    }
  });
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