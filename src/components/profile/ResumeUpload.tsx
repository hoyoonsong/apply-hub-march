import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";

interface ResumeUploadProps {
  onResumeChange: (resume: any) => void;
  currentResume?: any;
}

export default function ResumeUpload({
  onResumeChange,
  currentResume,
}: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, Word document, or text file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old resume if it exists (profile files - always cleanup)
      if (currentResume && currentResume.filePath) {
        await supabase.storage
          .from("application-files")
          .remove([currentResume.filePath])
          .catch(() => {
            // Ignore errors - file might not exist
          });
      }

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_resume.${fileExt}`;
      const filePath = `profiles/${user.id}/resume/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("application-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file info object
      const resumeInfo = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath: filePath,
        uploadedAt: new Date().toISOString(),
      };

      onResumeChange(resumeInfo);
    } catch (err) {
      console.error("Error uploading resume:", err);
      setError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    // Delete the file from storage when removing
    if (currentResume && currentResume.filePath) {
      try {
        await supabase.storage
          .from("application-files")
          .remove([currentResume.filePath])
          .catch(() => {
            // Ignore errors - file might not exist
          });
      } catch (e) {
        // Ignore errors
      }
    }
    onResumeChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-600">Resume Upload</div>

      {currentResume ? (
        <div className="bg-gray-50 rounded border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-lg">📄</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {currentResume.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {currentResume.fileSize
                  ? (currentResume.fileSize / (1024 * 1024)).toFixed(2)
                  : "0"}{" "}
                MB
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              {uploading ? "Uploading..." : "Click to upload resume"}
            </div>
            <div className="text-xs text-gray-500">
              PDF, Word, or text file (max 10MB)
            </div>
          </label>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
    </div>
  );
}
