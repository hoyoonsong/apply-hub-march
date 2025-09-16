import { supabase } from "./supabase-browser";

export type ProfileSnapshot = {
  full_name: string | null;
  given_name?: string | null;
  family_name?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  personal_statement?: string | null;
  files?: Array<{
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
  }> | null;
};

export function programUsesProfile(program: any): boolean {
  return (
    Boolean(program?.metadata?.application?.profile?.enabled) ||
    Boolean(program?.metadata?.form?.include_profile)
  );
}

export async function fetchProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const { data, error } = await supabase.rpc("get_profile_snapshot");
  if (error) {
    console.warn("get_profile_snapshot error", error);
    return null;
  }
  return (data as ProfileSnapshot) ?? null;
}

export function mergeProfileIntoAnswers(
  currentAnswers: any,
  profile: ProfileSnapshot | null
) {
  if (!profile) return currentAnswers ?? {};
  const next = { ...(currentAnswers ?? {}) };
  next.profile = {
    ...profile,
    __source: "profile",
    __version: 1,
    __snapshot_at: new Date().toISOString(),
  };
  return next;
}
