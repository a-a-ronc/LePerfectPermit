import React, { useState, useEffect } from 'react';
import { Document } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  document: Document;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewerType, setViewerType] = useState<'object' | 'embed' | 'data-url'>('object');
  
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
  
  // Fallback content for all viewer types
  const fallbackContent = (
    <div className="w-full h-full flex items-center justify-center">
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-700 text-sm max-w-md">
        <p className="font-medium">Your browser doesn't support embedded PDFs.</p>
        <p className="mt-2">You can:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Try opening the PDF in a new window</li>
          <li>Download the PDF to view it locally</li>
          <li>Update your browser to the latest version</li>
        </ul>
        <div className="mt-4 flex justify-center gap-2">
          <button 
            onClick={() => window.open(pdfUrl, '_blank')}
            className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded text-amber-800 text-xs font-medium hover:bg-amber-200"
          >
            Open in New Window
          </button>
          <button 
            onClick={() => {
              if (viewerType === 'object') setViewerType('embed');
              else if (viewerType === 'embed') setViewerType('data-url');
              else setViewerType('object');
            }}
            className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded text-amber-800 text-xs font-medium hover:bg-amber-200"
          >
            Try Different Viewer
          </button>
        </div>
      </div>
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
        
        {/* Since onError isn't well-supported for object tag, add a backup button */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setViewerType('embed')}
            className="px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded text-gray-700 text-xs font-medium hover:bg-gray-50"
          >
            PDF not loading? Try alternative viewer
          </button>
        </div>
      </div>
    );
  } else if (viewerType === 'embed') {
    return (
      <div className="w-full h-full">
        <embed 
          src={pdfUrl} 
          type="application/pdf" 
          width="100%" 
          height="100%" 
          className="w-full h-full"
        />
        {/* Embed doesn't support fallback content, so we add our own error handler */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setViewerType('data-url')}
            className="px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded text-gray-700 text-xs font-medium hover:bg-gray-50"
          >
            PDF not loading? Try alternative viewer
          </button>
        </div>
      </div>
    );
  } else {
    // Last resort: direct data URL in iframe with minimal restrictions
    return (
      <div className="w-full h-full">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={document?.fileName || "PDF Document"}
        />
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => window.open(pdfUrl, '_blank')}
            className="px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded text-gray-700 text-xs font-medium hover:bg-gray-50"
          >
            Open in New Window
          </button>
        </div>
      </div>
    );
  }
}