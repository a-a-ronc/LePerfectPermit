import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, File, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DocumentCategory } from "@shared/schema";

interface FileUploadProps {
  onFileSelect: (file: File, base64: string, category: string) => void;
  acceptedFileTypes?: string;
  category?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

export function FileUpload({
  onFileSelect,
  acceptedFileTypes = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  category,
  disabled = false,
  maxSizeMB = 10
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(category || "");
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      
      if (!e.target.files || e.target.files.length === 0) {
        setFile(null);
        return;
      }
      
      const selectedFile = e.target.files[0];
      
      // Check file size
      if (selectedFile.size > maxSizeBytes) {
        setError(`File size exceeds the ${maxSizeMB}MB limit.`);
        setFile(null);
        return;
      }
      
      // Check file type
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      const acceptedTypes = acceptedFileTypes.split(",").map(type => 
        type.trim().replace(".", "").toLowerCase()
      );
      
      if (!acceptedTypes.includes(fileExtension)) {
        setError(`Invalid file type. Accepted types: ${acceptedFileTypes}`);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
    },
    [acceptedFileTypes, maxSizeBytes, maxSizeMB]
  );
  
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
        }
        reject(new Error("Failed to convert file to base64"));
      };
      reader.onerror = error => reject(error);
    });
  }, []);
  
  const handleUpload = useCallback(async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    
    if (!selectedCategory && !category) {
      setError("Please select a document category.");
      return;
    }
    
    setLoading(true);
    try {
      const base64 = await convertToBase64(file);
      onFileSelect(file, base64, selectedCategory || category || "");
      // Reset file selection after successful upload if needed
      // setFile(null);
    } catch (err) {
      setError("An error occurred while processing the file.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [file, selectedCategory, category, onFileSelect, convertToBase64]);
  
  return (
    <div className="space-y-4">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="file">Upload Document</Label>
        <Input
          id="file"
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          disabled={disabled || loading}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Max file size: {maxSizeMB}MB. Accepted file types: {acceptedFileTypes}
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
      
      {file && (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
          <File className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm truncate max-w-[250px]">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </span>
        </div>
      )}
      
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!file || disabled || loading || (!selectedCategory && !category)}
        className="w-full"
      >
        {loading ? "Uploading..." : "Upload"}
        <Upload className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
