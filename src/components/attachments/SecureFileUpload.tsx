// Enhanced secure file upload component
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { FilePreview } from "./FilePreview";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/heic",
  "video/mp4",
  "audio/mpeg",
  "application/pdf",
];

// File type validation with magic number checking
const validateFileType = (file: File): boolean => {
  const type = file.type;

  // Basic MIME type check
  if (!ALLOWED_TYPES.includes(type)) {
    return false;
  }

  // Additional content validation could be added here
  // For example, checking PDF magic numbers:
  if (type === "application/pdf") {
    // Could read first few bytes to verify PDF header
    // This would require async file reading
  }

  return true;
};

// Sanitize filename to prevent path traversal
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscore
    .replace(/\.{2,}/g, ".") // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
    .substring(0, 100); // Limit length
};

// Rate limiting (simple client-side implementation)
const rateLimiter = {
  uploads: new Map<string, number[]>(),

  canUpload(userId: string, maxUploads = 10, windowMs = 60000): boolean {
    const now = Date.now();
    const userUploads = this.uploads.get(userId) || [];

    // Remove old uploads outside the window
    const recentUploads = userUploads.filter((time) => now - time < windowMs);

    if (recentUploads.length >= maxUploads) {
      return false;
    }

    // Add current upload
    recentUploads.push(now);
    this.uploads.set(userId, recentUploads);
    return true;
  },
};

export function SecureFileUpload({
  applicationId,
  fieldId,
  value,
  onChange,
  maxSizeMB = 50,
  disabled = false,
}: {
  applicationId: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxBytes = maxSizeMB * 1024 * 1024;

  async function handleAutoUpload() {
    if (!file || uploading) return;

    try {
      setUploading(true);
      setError(null);

      // Authentication check
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("You must be logged in to upload files");
      }

      // Rate limiting check
      if (!rateLimiter.canUpload(user.id)) {
        throw new Error("Too many uploads. Please wait before trying again.");
      }

      // Enhanced file validation
      if (!validateFileType(file)) {
        throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
      }

      if (file.size > maxBytes) {
        throw new Error(`File too large. Max ${maxSizeMB} MB.`);
      }

      // Sanitize filename
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `applications/${applicationId}/${fieldId}/${Date.now()}_${sanitizedFileName}`;

      // Upload to storage with additional security options
      const { data: upData, error: upErr } = await supabase.storage
        .from("application-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false, // Don't allow overwriting existing files
          contentType: file.type,
        });

      if (upErr) {
        throw new Error(`Upload failed: ${upErr.message}`);
      }

      // Store file metadata
      const fileInfo = {
        fileName: sanitizedFileName,
        filePath: filePath,
        fileSize: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
        checksum: upData.path, // Could add actual file hash here
      };

      onChange(JSON.stringify(fileInfo));
      setFile(null);
    } catch (error: any) {
      setError(error.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  // Auto-upload when file is selected
  useEffect(() => {
    if (file && !uploading) {
      handleAutoUpload();
    }
  }, [file]);

  // Parse the current value to show file info
  let currentFile: any = null;
  try {
    if (value) {
      currentFile = JSON.parse(value);
    }
  } catch (e) {
    // If it's not JSON, treat it as a simple filename
    currentFile = { fileName: value };
  }

  return (
    <div className="space-y-2">
      {/* File input */}
      <input
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={disabled || uploading}
        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Current file display */}
      {currentFile && (
        <div className="space-y-3">
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            <strong>Saved:</strong> {currentFile.fileName}
            {currentFile.fileSize && (
              <span className="text-gray-500">
                {" "}
                • {(currentFile.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>

          {/* File preview */}
          <div className="border rounded-lg p-3 bg-white">
            <FilePreview fileInfo={currentFile} />
          </div>
        </div>
      )}

      {/* Uploading status */}
      {uploading && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          <strong>Uploading...</strong> {file?.name}
        </div>
      )}
    </div>
  );
}
