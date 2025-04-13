import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl px-2 py-1",
    md: "text-xl px-3 py-1",
    lg: "text-2xl px-4 py-2"
  };

  return (
    <div className={cn(
      "bg-primary text-white font-bold rounded flex items-center",
      sizeClasses[size],
      className
    )}>
      <span className="mr-1">PainlessPermit</span>
      <span className="text-xs align-top">™️</span>
    </div>
  );
}
