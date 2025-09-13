// components/attachments/ApplicationFileViewer.tsx
import { FilePreview } from "./FilePreview";

type FileInfo = {
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: string;
};

export function ApplicationFileViewer({
  applicationAnswers,
}: {
  applicationAnswers: Record<string, any>;
}) {
  console.log(
    "[file-viewer] ApplicationFileViewer mounted with answers:",
    applicationAnswers
  );

  // Extract file information from application answers
  const fileFields = Object.entries(applicationAnswers)
    .filter(([key, value]) => {
      // Check if this looks like a file field (contains file metadata)
      if (typeof value !== "string") return false;
      try {
        const parsed = JSON.parse(value);
        return (
          parsed &&
          typeof parsed === "object" &&
          parsed.fileName &&
          parsed.filePath
        );
      } catch {
        return false;
      }
    })
    .map(([key, value]) => {
      try {
        const fileInfo: FileInfo = JSON.parse(value);
        return { fieldKey: key, fileInfo };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ fieldKey: string; fileInfo: FileInfo }>;

  console.log("[file-viewer] Found file fields:", fileFields);

  if (fileFields.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <div className="text-sm text-gray-600">No file attachments found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-900">
        File Attachments ({fileFields.length})
      </div>

      {fileFields.map(({ fieldKey, fileInfo }) => (
        <div key={fieldKey} className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">
            Field: {fieldKey}
          </div>
          <FilePreview fileInfo={fileInfo} />
        </div>
      ))}
    </div>
  );
}
