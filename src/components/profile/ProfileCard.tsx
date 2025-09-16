import React from "react";
import { FilePreview } from "../attachments/FilePreview";

export default function ProfileCard({ profile }: { profile: any }) {
  const addr = profile?.address || {};
  const files: any[] = Array.isArray(profile?.files) ? profile.files : [];

  return (
    <div className="rounded-2xl border p-4 space-y-3 bg-white">
      <div className="text-sm font-semibold">Profile</div>

      {profile?.full_name && (
        <div>
          <span className="text-xs uppercase text-gray-500">Name</span>
          <div>{profile.full_name}</div>
        </div>
      )}

      {profile?.date_of_birth && (
        <div>
          <span className="text-xs uppercase text-gray-500">Birthdate</span>
          <div>{profile.date_of_birth}</div>
        </div>
      )}

      {(addr?.line1 ||
        addr?.city ||
        addr?.state ||
        addr?.postal_code ||
        addr?.country) && (
        <div>
          <span className="text-xs uppercase text-gray-500">Address</span>
          <div>
            {[addr.line1, addr.line2].filter(Boolean).join(" ")}
            <br />
            {[addr.city, addr.state].filter(Boolean).join(", ")}{" "}
            {addr.postal_code || ""}
            {addr.country ? ` · ${addr.country}` : ""}
          </div>
        </div>
      )}

      {profile?.personal_statement && (
        <div>
          <span className="text-xs uppercase text-gray-500">
            Personal Statement
          </span>
          <div className="whitespace-pre-wrap text-sm">
            {profile.personal_statement}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs uppercase text-gray-500">Files</span>
          {files.map((fi, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm text-gray-600">
                📎 {fi.fileName} (
                {fi.fileSize ? (fi.fileSize / (1024 * 1024)).toFixed(2) : "0"}{" "}
                MB)
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <FilePreview fileInfo={fi} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
