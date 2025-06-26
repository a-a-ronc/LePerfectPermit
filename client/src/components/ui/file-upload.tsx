import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, File, Upload, X, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DocumentCategory } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { CustomFileInput } from "./CustomFileInput";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  onFileSelect: (file: File, base64: string, category: string) => void;
  onFilesChange?: (files: File[]) => void;
  acceptedFileTypes?: string;
  category?: string;
  disabled?: boolean;
  maxSizeMB?: number;
  multiple?: boolean;
}

export function FileUpload({
  onFileSelect,
  onFilesChange,
  acceptedFileTypes = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  category,
  disabled = false,
  maxSizeMB = 50, // 50MB - realistic database limit
  multiple = true
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(category || "");
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const newFiles: File[] = [];
      const fileList = Array.from(e.target.files);
      
      // Validate all selected files
      for (const file of fileList) {
        // Check file size
        if (file.size > maxSizeBytes) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          setError(`File "${file.name}" (${fileSizeMB}MB) exceeds the 50MB limit. Please use a smaller file.`);
          continue;
        }
        
        // Check file type
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
        const acceptedTypes = acceptedFileTypes.split(",").map(type => 
          type.trim().replace(".", "").toLowerCase()
        );
        
        if (!acceptedTypes.includes(fileExtension)) {
          setError(`File "${file.name}" has invalid type. Accepted types: ${acceptedFileTypes}`);
          continue;
        }
        
        newFiles.push(file);
      }
      
      if (newFiles.length > 0) {
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
      }
      
      // Reset the input value to allow selecting the same file again
      e.target.value = '';
    },
    [acceptedFileTypes, maxSizeBytes, maxSizeMB]
  );
  
  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);
  
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCategory(e.target.value);
    },
    []
  );
  
  const convertToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = error => reject(error);
    });
  }, []);
  
  const uploadCurrentFile = useCallback(async () => {
    if (currentFileIndex >= files.length) {
      return false; // No more files to upload
    }
    
    const currentFile = files[currentFileIndex];
    
    try {
      const base64 = await convertToBase64(currentFile);
      await onFileSelect(currentFile, base64, selectedCategory || category || "");
      setUploadedCount(prev => prev + 1);
      setCurrentFileIndex(prev => prev + 1);
      return true; // Successfully uploaded file
    } catch (err) {
      setError(`Error uploading "${currentFile.name}": ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false); // Stop the upload loop on error
      return false; // Failed to upload
    }
  }, [files, currentFileIndex, convertToBase64, onFileSelect, selectedCategory, category]);
  
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }
    
    if (!selectedCategory && !category) {
      setError("Please select a document category.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadedCount(0);
    setCurrentFileIndex(0);
    
    try {
      // Process files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const base64 = await convertToBase64(file);
          await onFileSelect(file, base64, selectedCategory || category || "");
          setUploadedCount(prev => prev + 1);
        } catch (err) {
          setError(`Error uploading "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);
          return; // Stop upload process on first error
        }
      }
      
      // Clear files list after successful upload of all files
      setFiles([]);
      onFilesChange?.([]);
      
    } catch (err) {
      setError("An error occurred while processing the files.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [files, convertToBase64, onFileSelect, selectedCategory, category, onFilesChange]);
  
  return (
    <div className="space-y-4">
      <div className="grid w-full gap-1.5">
        <div className="flex justify-between mb-2">
          <span>Upload Documents</span>
          {files.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </Badge>
          )}
        </div>
        <CustomFileInput
          id="file-upload"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          disabled={disabled || loading}
          multiple={multiple}
        />
        <p className="text-xs text-muted-foreground">
          Max file size: {maxSizeMB}MB. For best results, keep files under 10MB. Accepted file types: {acceptedFileTypes}
        </p>
      </div>
      
      {!category && (
        <div className="grid w-full gap-1.5">
          <Label htmlFor="category">Document Category</Label>
          <select
            id="category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            disabled={disabled || loading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a category</option>
            <option value={DocumentCategory.SITE_PLAN}>Site Plan</option>
            <option value={DocumentCategory.FACILITY_PLAN}>Facility Plan</option>
            <option value={DocumentCategory.EGRESS_PLAN}>Egress Plan</option>
            <option value={DocumentCategory.STRUCTURAL_PLANS}>Structural Plans & Calculations</option>
            <option value={DocumentCategory.COMMODITIES}>Commodities Stored</option>
            <option value={DocumentCategory.FIRE_PROTECTION}>Fire Protection</option>
            <option value={DocumentCategory.SPECIAL_INSPECTION}>Special Inspection</option>
          </select>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {files.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md bg-muted/30 p-2">
          <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-sm font-medium">Selected files:</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFiles([]);
                onFilesChange?.([]);
              }}
              disabled={loading}
              className="h-7 px-2 text-xs"
            >
              <Trash className="h-3 w-3 mr-1" /> Clear all
            </Button>
          </div>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm break-all">{file.name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleRemoveFile(index)} 
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {loading && uploadedCount > 0 && (
        <div className="text-sm text-center text-muted-foreground">
          Uploaded {uploadedCount}/{files.length} files...
        </div>
      )}
      
      <Button
        type="button"
        onClick={handleUpload}
        disabled={files.length === 0 || disabled || loading || (!selectedCategory && !category)}
        className="w-full"
      >
        {loading ? "Uploading..." : `Upload ${files.length > 0 ? `(${files.length} ${files.length === 1 ? 'file' : 'files'})` : ''}`}
        <Upload className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}