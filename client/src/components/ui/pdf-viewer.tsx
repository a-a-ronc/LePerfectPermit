import React, { useState, useEffect } from 'react';
import { Document } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  document: Document;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Create a blob URL for the PDF content
    if (document?.fileContent) {
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
        const url = URL.createObjectURL(blob);
        
        setPdfUrl(url);
        setLoading(false);
        
        // Clean up the URL on unmount
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error creating PDF blob URL:", error);
        setLoading(false);
      }
    }
  }, [document]);
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }
  
  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
          <p>Unable to load PDF preview.</p>
          <p className="mt-2">Please try downloading the file to view it.</p>
        </div>
      </div>
    );
  }
  
  return (
    <iframe
      src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
      className="w-full h-full border-0"
      title={document?.fileName || "PDF Document"}
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}