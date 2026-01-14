"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

/**
 * Dropzone component for drag-and-drop file uploads.
 *
 * Features:
 * - Drag and drop support
 * - Click to open file picker
 * - File type validation
 * - Max file count and size validation
 * - Visual feedback on drag over
 */
export function Dropzone({
  onFilesAdded,
  accept = "image/*",
  maxFiles = 20,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const validateFiles = React.useCallback(
    (files: File[]): File[] => {
      return files.filter((file) => {
        // Check file type
        if (accept && !file.type.match(accept.replace("*", ".*"))) {
          console.warn(`File ${file.name} rejected: invalid type`);
          return false;
        }
        // Check file size
        if (file.size > maxSize) {
          console.warn(`File ${file.name} rejected: exceeds max size`);
          return false;
        }
        return true;
      });
    },
    [accept, maxSize]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files).slice(0, maxFiles);
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    },
    [disabled, validateFiles, maxFiles, onFilesAdded]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = validateFiles(files).slice(0, maxFiles);
    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-border",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Upload
        className={cn(
          "mb-4 h-10 w-10 transition-colors",
          isDragOver ? "text-primary" : "text-muted-foreground"
        )}
      />
      <p className="text-sm font-medium text-foreground">
        {isDragOver ? "Drop images here" : "Drag & drop images here"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        or click to browse
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Max {maxFiles} images, {Math.round(maxSize / 1024 / 1024)}MB each
      </p>
    </div>
  );
}

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

interface ImagePreviewGridProps {
  images: ImagePreview[];
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Grid display for uploaded image previews.
 */
export function ImagePreviewGrid({
  images,
  onRemove,
  className,
}: ImagePreviewGridProps) {
  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className
      )}
    >
      {images.map((image) => (
        <div
          key={image.id}
          className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border/50 bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.preview}
            alt={image.file.name}
            className="h-full w-full object-cover"
          />
          {/* Hover overlay with remove button */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
              className="rounded-full bg-destructive p-2 text-white transition-transform hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* File info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
            <p className="truncate text-xs font-medium text-foreground">
              {image.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(image.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { ImagePreview };
