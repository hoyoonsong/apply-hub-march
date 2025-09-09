import { supabase } from "../lib/supabase";

export type ReviewQueueItem = {
  application_id: string;
  program_id: string;
  program_name: string;
  applicant_id: string;
  applicant_name: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchReviewQueue(programId?: string, status?: string) {
  const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
    p_program_id: programId ?? null,
    p_status_filter: status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ReviewQueueItem[];
}

export type ReviewableApplication = {
  application_id: string;
  program_id: string;
  program_name: string;
  application_schema: any;
  answers: any;
  applicant_id: string;
  applicant_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function fetchApplicationForReview(applicationId: string) {
  const { data, error } = await supabase
    .rpc("app_get_application_for_review_v1", {
      p_application_id: applicationId,
    })
    .single();
  if (error) throw error;
  return data as ReviewableApplication;
}

export async function saveReviewDraft(
  applicationId: string,
  ratings: Record<string, any>,
  score: number | null,
  comments: string
) {
  const { data, error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: applicationId,
    p_ratings: ratings ?? {},
    p_score: score ?? null,
    p_comments: comments ?? null,
    p_status: "draft",
  });
  if (error) throw error;
  return data;
}

export async function submitReview(
  applicationId: string,
  ratings: Record<string, any>,
  score: number,
  comments: string
) {
  const { data, error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: applicationId,
    p_ratings: ratings ?? {},
    p_score: score ?? null,
    p_comments: comments ?? null,
    p_status: "submitted",
  });
  if (error) throw error;
  return data;
}
