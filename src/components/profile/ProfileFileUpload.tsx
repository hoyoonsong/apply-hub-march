import { useState } from "react";
import { supabase } from "../../lib/supabase-browser";

export default function ProfileFileUpload({
  value,
  onChange,
}: {
  value: any[];
  onChange: (arr: any[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload images, videos, audio, PDF, Word documents, or text files"
      );
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const filePath = `profiles/${user.id}/profile/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("application-files") // existing private bucket
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
      if (error) throw error;
      const info = {
        fileName: file.name,
        filePath,
        fileSize: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
      };
      onChange([...(Array.isArray(value) ? value : []), info]);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAt(i: number) {
    const arr = [...(Array.isArray(value) ? value : [])];
    arr.splice(i, 1);
    onChange(arr);
  }

  const files = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-600">
        Portfolio and Additional Files
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <input
          type="file"
          id="portfolio-upload"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={onPick}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="portfolio-upload" className="cursor-pointer block">
          <div className="text-2xl mb-2">📎</div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            {uploading ? "Uploading..." : "Click to upload files"}
          </div>
          <div className="text-xs text-gray-500">
            Images, videos, audio, PDF, Word, or text files (max 50MB each)
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fi, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded border p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="text-lg">📎</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {fi.fileName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {fi.fileSize
                      ? (fi.fileSize / (1024 * 1024)).toFixed(2)
                      : "0"}{" "}
                    MB
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeAt(i)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
