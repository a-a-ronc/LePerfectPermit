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
  const [viewerSwitchCount, setViewerSwitchCount] = useState(0);
  
  useEffect(() => {
    if (document?.fileContent) {
      try {
        // Base64 to binary conversion
        const byteCharacters = atob(document.fileContent);
        
        // For text files, just decode and display the text content
        if (document.fileType === 'text/plain') {
          setFileContent(byteCharacters);
          setLoading(false);
          return;
        }
        
        // For PDFs and other binary files, create a blob URL
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Create blob and URL
        const blob = new Blob([byteArray], { type: document.fileType });
        const url = URL.createObjectURL(blob);
        
        setFileUrl(url);
        setLoading(false);
        
        // Clean up the URL on unmount
        return () => {
          if (url) URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error creating file preview:", error);
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
            }}
            className="px-3 py-1.5 bg-primary/90 backdrop-blur text-white rounded text-xs font-medium hover:bg-primary"
          >
            Download
          </button>
        </div>
        <div className="max-w-3xl mx-auto whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {fileContent}
        </div>
      </div>
    );
  }
  
  if (!fileUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
          <p>Unable to load document preview.</p>
          <p className="mt-2">Please try downloading the file to view it.</p>
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