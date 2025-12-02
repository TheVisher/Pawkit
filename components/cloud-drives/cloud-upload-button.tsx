"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { cloudStorage } from "@/lib/services/cloud-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface CloudUploadButtonProps {
  providerId: CloudProviderId;
  currentPath: string;
  onUploadComplete: () => void;
}

export function CloudUploadButton({ providerId, currentPath, onUploadComplete }: CloudUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToastStore();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) {
        toast.error("Provider not found");
        return;
      }

      const totalFiles = files.length;
      let uploadedCount = 0;

      for (const file of Array.from(files)) {
        toast.info(`Uploading ${file.name}...`);

        try {
          const result = await provider.uploadFile(file, file.name, currentPath);

          if (result.success) {
            uploadedCount++;
            setProgress(Math.round((uploadedCount / totalFiles) * 100));
          } else {
            toast.error(`Failed to upload ${file.name}: ${result.error}`);
          }
        } catch (err) {
          console.error(`[CloudUploadButton] Upload failed for ${file.name}:`, err);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedCount === totalFiles) {
        toast.success(`Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}`);
      } else if (uploadedCount > 0) {
        toast.warning(`Uploaded ${uploadedCount} of ${totalFiles} files`);
      }

      onUploadComplete();
    } catch (error) {
      console.error("[CloudUploadButton] Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <GlowButton
        onClick={handleClick}
        variant="primary"
        size="sm"
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {progress > 0 ? `${progress}%` : "Uploading..."}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </>
        )}
      </GlowButton>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}
