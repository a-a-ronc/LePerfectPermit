import React, { useState, useEffect } from 'react';
import { Document } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  document: Document;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerSwitchCount, setViewerSwitchCount] = useState(0);
  
  useEffect(() => {
    if (document?.fileContent) {
      try {
        // Check for placeholder text which causes errors
        if (document.fileContent.includes('[Your Name]') || 
            (document.fileContent.includes('[') && document.fileContent.includes(']'))) {
          console.error("Document contains placeholder text which is invalid");
          setError("This document contains invalid placeholder text. Please regenerate the cover letter.");
          setLoading(false);
          return;
        }
        
        // For text files, just decode and display the text content directly
        if (document.fileType === 'text/plain') {
          try {
            // Base64 to text conversion
            const decodedContent = atob(document.fileContent);
            setFileContent(decodedContent);
            setLoading(false);
          } catch (textError) {
            console.error("Error decoding text content:", textError);
            setError("Error displaying text content. The file may be corrupted.");
            setLoading(false);
          }
          return;
        }
        
        // For PDFs and other binary files, use direct data URL first
        try {
          // Try direct data URL method first
          const url = `data:${document.fileType};base64,${document.fileContent}`;
          setFileUrl(url);
          setLoading(false);
        } catch (directError) {
          console.error("Error with direct URL, falling back to blob:", directError);
          
          // Fall back to blob method
          try {
            // Base64 to binary conversion
            const byteCharacters = atob(document.fileContent);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            
            // Create blob and URL
            const blob = new Blob([byteArray], { type: document.fileType });
            const blobUrl = URL.createObjectURL(blob);
            
            setFileUrl(blobUrl);
            setLoading(false);
            
            // Clean up the URL on unmount
            return () => {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
            };
          } catch (binaryError) {
            console.error("Error creating binary file preview:", binaryError);
            setError("Error creating file preview. The file may be corrupted.");
            setLoading(false);
          }
        }
      } catch (error: any) {
        console.error("Error creating file preview:", error);
        setError(`Error: ${error.message || "Unknown error creating preview"}`);
        setLoading(false);
      }
    }
  }, [document]);
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading document preview...</p>
        </div>
      </div>
    );
  }
  
  // Text file viewer
  if (document.fileType === 'text/plain' && fileContent) {
    return (
      <div className="w-full h-full overflow-auto p-6 text-gray-800 bg-white shadow-inner relative">
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => {
              try {
                // Download as text file
                const blob = new Blob([fileContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = document.fileName || 'download.txt';
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (error: any) {
                console.error("Error downloading text file:", error);
                alert("Download error: " + (error.message || "Unable to download file"));
              }
            }}
            className="px-3 py-1.5 bg-primary/90 backdrop-blur text-white rounded text-xs font-medium hover:bg-primary"
          >
            Download
          </button>
          <button
            onClick={() => {
              // Open in new window
              try {
                const blob = new Blob([fileContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              } catch (error: any) {
                console.error("Error opening text file:", error);
                alert("Preview error: " + (error.message || "Unable to open file in new window"));
              }
            }}
            className="px-3 py-1.5 bg-gray-200 backdrop-blur text-gray-800 rounded text-xs font-medium hover:bg-gray-300"
          >
            Open in New Window
          </button>
        </div>
        <div className="max-w-3xl mx-auto whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {fileContent}
        </div>
      </div>
    );
  }
  
  if (error || !fileUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm max-w-md">
          <p className="font-semibold">Error loading document preview</p>
          {error ? (
            <p className="mt-2">{error}</p>
          ) : (
            <p className="mt-2">Unable to load the document preview. The file may be corrupted or contain invalid content.</p>
          )}
          <p className="mt-4 text-xs text-red-600">
            If this is a cover letter with placeholder text, please try regenerating it. Otherwise, 
            try uploading the document again or contact support.
          </p>
        </div>
      </div>
    );
  }
  
  // Switch PDF viewer type and track attempts
  const switchViewerType = () => {
    setViewerSwitchCount(prev => prev + 1);
    window.open(fileUrl, '_blank');
  };
  
  // PDF and other binary files viewer
  return (
    <div className="w-full h-full relative">
      <iframe
        src={fileUrl}
        className="w-full h-full border-0"
        title={document?.fileName || "Document Preview"}
        sandbox="allow-same-origin allow-scripts allow-forms"
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={switchViewerType}
          className="px-3 py-1.5 bg-primary/90 backdrop-blur text-white rounded text-xs font-medium hover:bg-primary"
        >
          Open in New Window
        </button>
      </div>
    </div>
  );
}