// src/lib/reviewApi.ts
import { supabase } from "./supabase";

export type ReviewStatus = "draft" | "submitted";
export type Ratings = Record<string, number | string | boolean | null>;

export async function listReviewQueue(
  programId: string,
  statusFilter?: ReviewStatus | null
) {
  const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
    p_program_id: programId,
    p_status_filter: statusFilter ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getApplicationForReview(applicationId: string) {
  const { data, error } = await supabase.rpc(
    "app_get_application_for_review_v1",
    {
      p_application_id: applicationId,
    }
  );
  if (error) throw error;
  return data; // row from public.applications (+ any view extras your RPC returns)
}

type UpsertArgs = {
  applicationId: string;
  ratings?: Ratings;
  comments?: string | null;
  score?: number | null;
  status: ReviewStatus;
};

export async function upsertReview({
  applicationId,
  ratings,
  comments,
  score,
  status,
}: UpsertArgs) {
  // Enforce correct nullability for PostgREST
  const { data, error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: applicationId,
    p_ratings: ratings ?? {}, // jsonb
    p_comments: (comments ?? null) as string | null, // text
    p_score: Number.isFinite(score as number) ? (score as number) : null, // integer|null
    p_status: status, // text: 'draft' | 'submitted'
  });
  if (error) throw error;
  return data;
}
