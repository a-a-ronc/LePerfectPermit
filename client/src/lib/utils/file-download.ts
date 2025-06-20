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

// Save file with file picker dialog
export async function saveFileWithPicker(
  fileName: string, 
  content: string | Uint8Array, 
  mimeType: string
): Promise<string | null> {
  try {
    // In iframe environments like Replit, File System Access API is blocked
    // Use traditional download with user notification
    downloadFileTraditional(fileName, content, mimeType);
    
    // Show user notification about download location
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    notification.innerHTML = `
      <strong>File Downloaded:</strong><br>
      ${fileName}<br>
      <small>Check your Downloads folder</small>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
    
    return 'downloaded-to-default';
  } catch (error) {
    console.error('Error in saveFileWithPicker:', error);
    downloadFileTraditional(fileName, content, mimeType);
    return 'fallback-download';
  }
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