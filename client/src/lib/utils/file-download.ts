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
  return 'showSaveFilePicker' in window && 'showDirectoryPicker' in window;
}

// Save file with file picker dialog
export async function saveFileWithPicker(
  fileName: string, 
  content: string | Uint8Array, 
  mimeType: string
): Promise<string | null> {
  try {
    if (!isFileSystemAccessSupported()) {
      // Fallback to traditional download
      downloadFileTraditional(fileName, content, mimeType);
      return null;
    }

    const options: any = {
      suggestedName: fileName,
      types: [{
        description: 'Files',
        accept: {
          [mimeType]: [`.${fileName.split('.').pop()}`]
        }
      }]
    };

    // Try to use the last saved directory if available
    const lastPath = localStorage.getItem(LAST_DOWNLOAD_PATH_KEY);
    if (lastPath) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ 
          startIn: lastPath as any,
          mode: 'readwrite'
        });
        // If successful, create file in that directory
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        
        if (typeof content === 'string') {
          await writable.write(content);
        } else {
          await writable.write(content);
        }
        await writable.close();
        
        // Store the directory path for next time
        localStorage.setItem(LAST_DOWNLOAD_PATH_KEY, dirHandle.name);
        return dirHandle.name;
      } catch (e) {
        // If lastPath fails, continue with normal picker
      }
    }

    // Show save file picker
    const fileHandle = await (window as any).showSaveFilePicker(options);
    const writable = await fileHandle.createWritable();
    
    if (typeof content === 'string') {
      await writable.write(content);
    } else {
      await writable.write(content);
    }
    await writable.close();

    // Store the parent directory for next time
    const pathParts = fileHandle.name.split('/');
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('/');
      localStorage.setItem(LAST_DOWNLOAD_PATH_KEY, parentPath);
    }

    return fileHandle.name;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null; // User cancelled
    }
    console.error('Error saving file:', error);
    // Fallback to traditional download
    downloadFileTraditional(fileName, content, mimeType);
    return null;
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