import React, { useState } from "react";
import { supabase } from "../../lib/supabase-browser";

export default function ProfileFileUpload({
  value,
  onChange,
}: {
  value: any[];
  onChange: (arr: any[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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
      alert(err.message || "Upload failed");
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

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Profile Files</div>
      <input type="file" onChange={onPick} disabled={uploading} />
      <ul className="space-y-2">
        {(Array.isArray(value) ? value : []).map((fi, i) => (
          <li
            key={i}
            className="border rounded-lg p-3 flex items-center justify-between"
          >
            <div className="text-xs">
              <div className="font-medium">{fi.fileName}</div>
              <div className="text-gray-500 break-all">{fi.filePath}</div>
            </div>
            <button
              className="text-xs text-red-600"
              onClick={() => removeAt(i)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {(!value || value.length === 0) && (
        <div className="text-xs text-gray-500">No files uploaded.</div>
      )}
    </div>
  );
}
