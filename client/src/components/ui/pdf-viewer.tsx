import React, { useState, useEffect } from 'react';
import { Document } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  document: Document;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // Start with iframe viewer since it has fewer restrictions in the Replit environment
  const [viewerType, setViewerType] = useState<'object' | 'embed' | 'data-url'>('data-url');
  const [viewerSwitchCount, setViewerSwitchCount] = useState(0);
  
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
  
  // Switch between different PDF embedding approaches if one fails
  const handleObjectError = () => {
    console.log("Object tag failed, trying embed tag");
    setViewerType('embed');
  };
  
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
  
  // Switch PDF viewer type and track attempts
  const switchViewerType = () => {
    setViewerSwitchCount(prev => prev + 1);
    
    // Determine next viewer type
    let nextViewerType: 'object' | 'embed' | 'data-url';
    if (viewerType === 'data-url') nextViewerType = 'embed';
    else if (viewerType === 'embed') nextViewerType = 'object';
    else nextViewerType = 'data-url';
    
    // Log and set the new type
    console.log(`Switching from ${viewerType} to ${nextViewerType}, attempt: ${viewerSwitchCount + 1}`);
    setViewerType(nextViewerType);
  };
  
  // Fallback content for all viewer types
  const fallbackContent = (
    <div className="w-full h-full flex items-center justify-center">
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-700 text-sm max-w-md">
        <p className="font-medium">PDF preview not available</p>
        <p className="mt-2">This might be due to browser restrictions in the Replit environment.</p>
        <p className="text-xs mt-1 text-amber-600">Current viewer: {viewerType}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button 
            onClick={() => window.open(pdfUrl, '_blank')}
            className="w-full py-2 bg-primary text-white rounded font-medium hover:bg-primary/90"
          >
            Open in New Window
          </button>
          <button 
            onClick={switchViewerType}
            className="w-full py-2 bg-amber-100 border border-amber-300 rounded text-amber-800 font-medium hover:bg-amber-200"
          >
            Try Different Viewer ({viewerSwitchCount}/2)
          </button>
        </div>
      </div>
    </div>
  );

  // Common toolbar with buttons for all viewer types
  const ViewerToolbar = () => (
    <div className="absolute bottom-4 right-4 flex gap-2">
      <button
        onClick={switchViewerType}
        className="px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded text-gray-700 text-xs font-medium hover:bg-gray-50"
      >
        Try Different Viewer ({viewerSwitchCount}/2)
      </button>
      <button
        onClick={() => window.open(pdfUrl, '_blank')}
        className="px-3 py-1.5 bg-primary/90 backdrop-blur text-white rounded text-xs font-medium hover:bg-primary"
      >
        Open in New Window
      </button>
    </div>
  );

  if (viewerType === 'object') {
    return (
      <div className="w-full h-full relative">
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full"
        >
          {fallbackContent}
        </object>
        <ViewerToolbar />
      </div>
    );
  } else if (viewerType === 'embed') {
    return (
      <div className="w-full h-full relative">
        <embed 
          src={pdfUrl} 
          type="application/pdf" 
          width="100%" 
          height="100%" 
          className="w-full h-full"
        />
        {/* fallbackContent will be shown by the browser if embed fails */}
        <ViewerToolbar />
      </div>
    );
  } else {
    // iframe with minimal restrictions - most compatible option
    return (
      <div className="w-full h-full relative">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={document?.fileName || "PDF Document"}
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
        <ViewerToolbar />
      </div>
    );
  }
}