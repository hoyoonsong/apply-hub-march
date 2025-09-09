import { supabase } from "./supabase";

export type ReviewerListItem = {
  application_id: string;
  program_id: string;
  applicant_id: string;
  application_status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  created_at: string;
  updated_at: string;
  my_review_status: "none" | "draft" | "submitted";
  my_score: number | null;
};

export async function listReviewerApplications(
  programId: string,
  status?: string
) {
  const { data, error } = await supabase.rpc("reviewer_list_applications_v1", {
    p_program_id: programId,
    p_status: status ?? null,
  });

  if (error) throw error;
  return (data ?? []) as ReviewerListItem[];
}

export type ReviewRow = {
  id: string;
  application_id: string;
  reviewer_id: string;
  ratings: Record<string, number | string>;
  comments: string | null;
  score: number | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyReview(applicationId: string) {
  const { data, error } = await supabase.rpc("reviewer_get_my_review_v1", {
    p_application_id: applicationId,
  });
  if (error) {
    // If none exists yet, RPC may return null — treat as empty draft.
    if (error.message?.toLowerCase().includes("not found")) return null;
    // RLS 403 → not assigned
    throw error;
  }
  return (data ?? null) as ReviewRow | null;
}

export type UpsertReviewInput = {
  application_id: string;
  score?: number | null;
  ratings?: Record<string, number | string>;
  comments?: string | null;
  status?: "draft" | "submitted";
};

export async function upsertReview(input: UpsertReviewInput) {
  const { data, error } = await supabase.rpc("reviewer_upsert_review_v1", {
    p_application_id: input.application_id,
    p_score: input.score ?? null,
    p_ratings: (input.ratings ?? {}) as any,
    p_comments: input.comments ?? null,
    p_status: input.status ?? "draft",
  });
  if (error) throw error;
  return data as ReviewRow;
}

// New RPC wrappers for the updated reviewer system
export type ReviewQueueItem = {
  application_id: string;
  applicant_name: string | null;
  submitted_at: string | null;
  status: string;
};

export async function listReviewQueue(programId: string) {
  const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
    p_program_id: programId,
    p_status_filter: "submitted",
  });
  if (error) throw error;
  return data as ReviewQueueItem[];
}

export async function getApplicationForReview(applicationId: string) {
  const { data, error } = await supabase.rpc(
    "app_get_application_for_review_v1",
    {
      p_application_id: applicationId,
    }
  );
  if (error) throw error;
  return data; // { application, program, schema, answers, applicant_profile, ... }
}

export async function createOrUpdateReview(params: {
  applicationId: string;
  score: number;
  rubric: Record<string, any>;
  comments?: string;
}) {
  const { data, error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: params.applicationId,
    p_ratings: params.rubric,
    p_score: params.score,
    p_comments: params.comments ?? null,
    p_status: "draft",
  });
  if (error) throw error;
  return data;
}
