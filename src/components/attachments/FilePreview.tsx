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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 text-center">
        <div className="text-xs md:text-sm text-gray-600">
          Loading preview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
        <div className="text-xs md:text-sm text-red-600">{error}</div>
        <div className="text-[10px] md:text-xs text-gray-500 mt-1 break-words">
          File: {fileInfo.fileName}
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
        <div className="text-xs md:text-sm text-yellow-600">
          Unable to generate preview
        </div>
        <div className="text-[10px] md:text-xs text-gray-500 mt-1 break-words">
          File: {fileInfo.fileName}
        </div>
      </div>
    );
  }

  const contentType = fileInfo.contentType?.toLowerCase() || "";
  const isImage =
    contentType.startsWith("image/") && !contentType.includes("heic");
  const isVideo = contentType.startsWith("video/");
  const isAudio = contentType.startsWith("audio/");
  const isPdf = contentType.includes("pdf");
  const isHeic = contentType.includes("heic") || contentType.includes("heif");

  // Fallback: try to determine type from file extension if contentType is empty
  const fileName = fileInfo.fileName || "";
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
  const isPdfByExtension = fileExtension === "pdf" || isPdf;
  const isImageByExtension =
    ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension) || isImage;
  const isVideoByExtension =
    ["mp4", "mov", "avi", "webm"].includes(fileExtension) || isVideo;
  const isAudioByExtension =
    ["mp3", "wav", "ogg", "m4a"].includes(fileExtension) || isAudio;

  return (
    <div className="bg-white p-2 md:p-4">
      {/* File header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 md:mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <div className="text-xs md:text-sm font-medium text-gray-900 break-words">
            {fileInfo.fileName}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">
            {(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] md:text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap self-start sm:self-auto"
        >
          Open in new tab
        </a>
      </div>

      {/* File preview */}
      <div className="mt-2 md:mt-3">
        {(isImage || isImageByExtension) && (
          <div className="max-w-full">
            <img
              src={signedUrl}
              alt={fileInfo.fileName}
              className="max-w-full h-auto rounded border"
              style={{ maxHeight: "300px" }}
            />
          </div>
        )}

        {(isVideo || isVideoByExtension) && (
          <div className="max-w-full">
            <video
              src={signedUrl}
              controls
              className="max-w-full h-auto rounded border"
              style={{ maxHeight: "300px" }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {(isAudio || isAudioByExtension) && (
          <div className="w-full">
            <audio src={signedUrl} controls className="w-full">
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}

        {(isPdf || isPdfByExtension) && (
          <div className="w-full">
            <iframe
              src={`${signedUrl}#navpanes=0&toolbar=1&view=FitH`}
              className="w-full rounded border h-[400px] md:h-[500px]"
              title={fileInfo.fileName}
            />
          </div>
        )}

        {(isHeic ||
          (!isImage &&
            !isVideo &&
            !isAudio &&
            !isPdf &&
            !isImageByExtension &&
            !isVideoByExtension &&
            !isAudioByExtension &&
            !isPdfByExtension)) && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 md:p-4 text-center">
            <div className="text-xs md:text-sm text-gray-600 mb-2">
              Preview not available for this file type
            </div>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Open file
            </a>
          </div>
        )}
      </div>

      {/* File metadata */}
      <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-gray-500 border-t pt-2">
        <div className="break-words">Type: {fileInfo.contentType}</div>
        <div>Uploaded: {new Date(fileInfo.uploadedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
