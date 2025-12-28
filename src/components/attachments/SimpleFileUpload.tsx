// components/attachments/SimpleFileUpload.tsx
import { useState, useEffect } from "react";
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

export function SimpleFileUpload({
  applicationId,
  fieldId,
  value,
  onChange,
  maxSizeMB = 50,
  disabled = false,
  applicationStatus,
}: {
  applicationId: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  applicationStatus?: "draft" | "submitted" | "reviewing" | "accepted" | "rejected" | "waitlisted";
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const maxBytes = maxSizeMB * 1024 * 1024;

  console.log("[simple-upload] mounted for field", fieldId, "value:", value);

  // Auto-upload when file is selected
  useEffect(() => {
    if (file && !uploading) {
      handleAutoUpload();
    }
  }, [file]);

  async function handleAutoUpload() {
    if (!file || uploading) return;

    try {
      setUploading(true);

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("[simple-upload] auth error", authError);
        alert("You must be logged in to upload files");
        setFile(null);
        return;
      }

      console.log("[simple-upload] user authenticated:", user.id);

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.type || "unknown"}`);
        setFile(null);
        return;
      }
      if (file.size > maxBytes) {
        alert(`File too large. Max ${maxSizeMB} MB.`);
        setFile(null);
        return;
      }

      // Delete old file if it exists AND application is in draft status
      // For submitted applications, keep old files for audit trail
      if (value && applicationStatus === "draft") {
        try {
          const oldFileInfo = JSON.parse(value);
          if (oldFileInfo && oldFileInfo.filePath) {
            // Silently delete old file - don't fail if it doesn't exist
            await supabase.storage
              .from("application-files")
              .remove([oldFileInfo.filePath])
              .catch(() => {
                // Ignore errors - file might not exist
              });
          }
        } catch (e) {
          // If value is not valid JSON, ignore
        }
      }

      const filePath = `applications/${applicationId}/${fieldId}/${Date.now()}_${
        file.name
      }`;

      console.log("[simple-upload] uploading", {
        fieldId,
        filePath,
        type: file.type,
        size: file.size,
        userId: user.id,
      });

      // Upload to storage
      const { data: upData, error: upErr } = await supabase.storage
        .from("application-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

      if (upErr) {
        console.error("[simple-upload] storage error", upErr);
        alert(`Upload failed: ${upErr.message}`);
        setFile(null);
        return;
      }

      console.log("[simple-upload] storage success", upData);

      // Instead of using the application_attachments table,
      // we'll store the file info in the application's answers
      // This bypasses the RLS issue
      const fileInfo = {
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
      };

      // Success! Update the form value with file info
      console.log("[simple-upload] success", fileInfo);
      onChange(JSON.stringify(fileInfo)); // Store as JSON string
      setFile(null);
    } catch (error: any) {
      console.error("[simple-upload] unexpected error", error);
      alert(`Unexpected error: ${error.message}`);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  // Parse the current value to show file info
  let currentFile: any = null;
  try {
    if (value && value.trim() !== "") {
      const parsed = JSON.parse(value);
      // Only treat it as a file if it has the expected file structure
      // Check for file-specific properties to avoid treating profile data as files
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.fileName || parsed.filePath) &&
        !parsed.__source &&
        !parsed.full_name &&
        !parsed.email &&
        !parsed.address
      ) {
        currentFile = parsed;
      } else if (typeof value === "string" && !value.startsWith("{")) {
        // If it's a simple string (not JSON), treat it as a filename
        currentFile = { fileName: value };
      }
      // Otherwise, treat as empty/invalid (don't set currentFile)
    }
  } catch (e) {
    // If it's not JSON, treat it as a simple filename only if it's not empty
    if (value && typeof value === "string" && value.trim() !== "") {
      currentFile = { fileName: value };
    }
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {/* File input - only show when no file is saved */}
      {!currentFile && (
        <input
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={disabled || uploading}
          className="w-full text-xs md:text-sm text-gray-500 file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      )}

      {/* Current file display */}
      {currentFile && (
        <div className="space-y-2 md:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm text-green-600 bg-green-50 p-2.5 md:p-3 rounded">
            <div className="min-w-0 flex-1">
              <strong className="font-semibold">Saved:</strong>{" "}
              <span className="break-words">{currentFile.fileName}</span>
              {currentFile.fileSize && (
                <span className="text-gray-500 block sm:inline sm:ml-1 mt-0.5 sm:mt-0">
                  {(currentFile.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!disabled && (
                <>
                  <input
                    type="file"
                    accept={ALLOWED_TYPES.join(",")}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={disabled || uploading}
                    className="hidden"
                    id={`replace-file-${fieldId}`}
                  />
                  <label
                    htmlFor={`replace-file-${fieldId}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1.5 rounded hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer border border-blue-200"
                  >
                    Replace
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      // Delete the file from storage when removing (only for drafts)
                      if (applicationStatus === "draft" && currentFile?.filePath) {
                        try {
                          await supabase.storage
                            .from("application-files")
                            .remove([currentFile.filePath])
                            .catch(() => {
                              // Ignore errors - file might not exist
                            });
                        } catch (e) {
                          // Ignore errors
                        }
                      }
                      onChange("");
                      setFile(null);
                    }}
                    className="text-red-600 hover:text-red-800 font-medium text-xs px-3 py-1.5 rounded hover:bg-red-50 transition-colors whitespace-nowrap border border-red-200"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          {/* File preview */}
          <div className="border rounded-lg p-2 md:p-3 bg-white">
            <FilePreview fileInfo={currentFile} />
          </div>
        </div>
      )}

      {/* Uploading status */}
      {uploading && (
        <div className="text-xs md:text-sm text-blue-600 bg-blue-50 p-2.5 md:p-3 rounded">
          <strong>Uploading...</strong>{" "}
          <span className="break-words">{file?.name}</span>
        </div>
      )}
    </div>
  );
}
