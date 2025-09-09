import { SupabaseClient } from "@supabase/supabase-js";

export type ApplicationForReview = {
  id: string;
  program_id: string;
  user_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  answers: Record<string, any>;
  created_at: string;
  updated_at: string;
  application_schema: any;
};

export async function fetchApplicationForReview(
  supabase: SupabaseClient,
  applicationId: string
): Promise<ApplicationForReview | null> {
  const { data, error } = await supabase.rpc(
    "app_get_application_for_review_v1",
    { p_application_id: applicationId }
  );

  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return Array.isArray(data)
    ? (data[0] as ApplicationForReview)
    : (data as ApplicationForReview);
}

export async function saveReviewDraft(
  supabase: SupabaseClient,
  params: {
    applicationId: string;
    ratings: Record<string, any>;
    comments: string;
    score: number | null;
  }
) {
  const { error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: params.applicationId,
    p_ratings: params.ratings ?? {},
    p_comments: params.comments ?? "",
    p_score: params.score,
    p_status: "draft",
  });
  if (error) throw error;
}

export async function submitReview(
  supabase: SupabaseClient,
  params: {
    applicationId: string;
    ratings: Record<string, any>;
    comments: string;
    score: number | null;
  }
) {
  const { error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: params.applicationId,
    p_ratings: params.ratings ?? {},
    p_comments: params.comments ?? "",
    p_score: params.score,
    p_status: "submitted",
  });
  if (error) throw error;
}
