// components/attachments/FilePreview.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type FileInfo = {
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: string;
};

export function FilePreview({ fileInfo }: { fileInfo: FileInfo }) {
  console.log("[file-preview] FilePreview mounted with fileInfo:", fileInfo);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getSignedUrl() {
      try {
        setLoading(true);
        setError(null);

        console.log(
          "[file-preview] Getting signed URL for:",
          fileInfo.filePath
        );

        const { data, error: urlError } = await supabase.storage
          .from("application-files")
          .createSignedUrl(fileInfo.filePath, 60 * 10); // 10 minutes

        if (urlError) {
          console.error("[file-preview] URL error:", urlError);
          setError(`Failed to load file: ${urlError.message}`);
          return;
        }

        console.log("[file-preview] Got signed URL:", data?.signedUrl);
        setSignedUrl(data?.signedUrl || null);
      } catch (err: any) {
        console.error("[file-preview] Unexpected error:", err);
        setError(`Unexpected error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    getSignedUrl();
  }, [fileInfo.filePath]);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <div className="text-sm text-gray-600">Loading preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-sm text-red-600">{error}</div>
        <div className="text-xs text-gray-500 mt-1">
          File: {fileInfo.fileName}
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-sm text-yellow-600">
          Unable to generate preview
        </div>
        <div className="text-xs text-gray-500 mt-1">
          File: {fileInfo.fileName}
        </div>
      </div>
    );
  }

  const contentType = fileInfo.contentType.toLowerCase();
  const isImage =
    contentType.startsWith("image/") && !contentType.includes("heic");
  const isVideo = contentType.startsWith("video/");
  const isAudio = contentType.startsWith("audio/");
  const isPdf = contentType.includes("pdf");
  const isHeic = contentType.includes("heic") || contentType.includes("heif");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* File header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-medium text-gray-900">
            {fileInfo.fileName}
          </div>
          <div className="text-xs text-gray-500">
            {(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Open in new tab
        </a>
      </div>

      {/* File preview */}
      <div className="mt-3">
        {isImage && (
          <div className="max-w-full">
            <img
              src={signedUrl}
              alt={fileInfo.fileName}
              className="max-w-full h-auto rounded border"
              style={{ maxHeight: "500px" }}
            />
          </div>
        )}

        {isVideo && (
          <div className="max-w-full">
            <video
              src={signedUrl}
              controls
              className="max-w-full h-auto rounded border"
              style={{ maxHeight: "500px" }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {isAudio && (
          <div className="w-full">
            <audio src={signedUrl} controls className="w-full">
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}

        {isPdf && (
          <div className="w-full">
            <iframe
              src={signedUrl}
              className="w-full rounded border"
              style={{ height: "600px" }}
              title={fileInfo.fileName}
            />
          </div>
        )}

        {(isHeic || (!isImage && !isVideo && !isAudio && !isPdf)) && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
            <div className="text-sm text-gray-600 mb-2">
              Preview not available for this file type
            </div>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Open file
            </a>
          </div>
        )}
      </div>

      {/* File metadata */}
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <div>Type: {fileInfo.contentType}</div>
        <div>Uploaded: {new Date(fileInfo.uploadedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
