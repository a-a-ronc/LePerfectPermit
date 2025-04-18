import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CustomFileInputProps {
  id: string;
  accept?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
}

export function CustomFileInput({
  id,
  accept,
  onChange,
  disabled = false,
  multiple = false,
  className = "",
}: CustomFileInputProps) {
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(
        multiple && files.length > 1 
          ? `${files.length} files selected` 
          : files[0].name
      );
    } else {
      setFileName("");
    }
    onChange(e);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          variant="outline"
          className="bg-gray-200 hover:bg-gray-200 focus:bg-gray-200 active:bg-gray-200 px-4 border border-gray-300"
          style={{ 
            backgroundColor: '#e2e8f0',  
            color: '#475569',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' 
          }}
        >
          Select file(s)
        </Button>
        <Label className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName || "No file selected"}
        </Label>
      </div>
    </div>
  );
}