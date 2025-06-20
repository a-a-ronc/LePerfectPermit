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
    // Always try the File System Access API first if available
    if ('showSaveFilePicker' in window) {
      try {
        const options: any = {
          suggestedName: fileName,
          types: [{
            description: 'Files',
            accept: {
              [mimeType]: [`.${fileName.split('.').pop()}`]
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

        localStorage.setItem(LAST_DOWNLOAD_PATH_KEY, 'file-picker-used');
        return fileHandle.name;
      } catch (error) {
        const err = error as Error;
        if (err.name === 'AbortError') {
          return null; // User cancelled
        }
        console.log('File picker failed, falling back to download:', err.message);
      }
    }

    // Fallback to traditional download
    downloadFileTraditional(fileName, content, mimeType);
    return 'traditional-download';
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