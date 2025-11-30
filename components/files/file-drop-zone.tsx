"use client";

import { useCallback, useState, useRef } from "react";
import { Upload } from "lucide-react";
import { useFileStore } from "@/lib/stores/file-store";
import { ACCEPTED_FILE_TYPES } from "@/lib/utils/file-utils";

interface FileDropZoneProps {
  children: React.ReactNode;
  cardId?: string; // If provided, files will be attached to this card
  onFilesUploaded?: (fileIds: string[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileDropZone({
  children,
  cardId,
  onFilesUploaded,
  className = "",
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const uploadFiles = useFileStore((state) => state.uploadFiles);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current++;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      // Show copy cursor
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current = 0;
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // userId is managed by localDb initialization, pass empty string as placeholder
      const uploaded = await uploadFiles(files, "", cardId);
      if (uploaded.length > 0 && onFilesUploaded) {
        onFilesUploaded(uploaded.map((f) => f.id));
      }
    },
    [disabled, uploadFiles, cardId, onFilesUploaded]
  );

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-accent">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-lg font-medium">Drop files here</div>
            <div className="text-sm text-muted-foreground text-center">
              Files will be added to your library
              <br />
              <span className="text-xs opacity-75">.md files become native notes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FileUploadButtonProps {
  cardId?: string;
  onFilesUploaded?: (fileIds: string[]) => void;
  variant?: "default" | "icon" | "compact";
  className?: string;
  disabled?: boolean;
}

export function FileUploadButton({
  cardId,
  onFilesUploaded,
  variant = "default",
  className = "",
  disabled = false,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFiles = useFileStore((state) => state.uploadFiles);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // userId is managed by localDb initialization, pass empty string as placeholder
    const uploaded = await uploadFiles(files, "", cardId);
    if (uploaded.length > 0 && onFilesUploaded) {
      onFilesUploaded(uploaded.map((f) => f.id));
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground disabled:opacity-50 ${className}`}
          title="Upload files"
        >
          <Upload className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleChange}
          className="hidden"
        />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground disabled:opacity-50 ${className}`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleChange}
          className="hidden"
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-soft disabled:opacity-50 ${className}`}
      >
        <Upload className="h-4 w-4" />
        Upload Files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
