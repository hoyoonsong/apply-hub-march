import { supabase } from "./supabase";

export async function fetchProgram(programId: string) {
  const { data, error } = await supabase
    .from("programs_public")
    .select("id,name,description,application_schema,published,open_at,close_at")
    .eq("id", programId)
    .single();
  if (error) throw error;
  return data;
}

export async function startOrGetApplication(programId: string) {
  const { data, error } = await supabase.rpc(
    "app_start_or_get_application_v1",
    {
      p_program_id: programId,
    }
  );
  if (error) throw error;
  return data; // applications row
}

// Deprecated - use saveApplication from lib/rpc.ts instead

export async function submitApplication(applicationId: string) {
  const { data, error } = await supabase.rpc("app_submit_application_v1", {
    p_application_id: applicationId,
  });
  if (error) throw error;
  return data;
}

export async function listReviewQueue(
  programId: string,
  status?: string | null
) {
  const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
    p_program_id: programId,
    p_status_filter: status ?? null,
  });
  if (error) throw error;
  return data as {
    application_id: string;
    applicant_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
}

export async function getApplicationForReview(applicationId: string) {
  const { data, error } = await supabase.rpc(
    "app_get_application_for_review_v1",
    {
      p_application_id: applicationId,
    }
  );
  if (error) throw error;
  return data; // applications row
}

export async function upsertReview(params: {
  applicationId: string;
  ratings: any;
  score: number | null;
  comments: string | null;
  status: "draft" | "submitted";
  decision?: string | null;
}) {
  const { data, error } = await supabase.rpc("app_upsert_review_v1", {
    p_application_id: params.applicationId,
    p_ratings: params.ratings ?? {},
    p_score: params.score ?? null,
    p_comments: params.comments ?? null,
    p_status: params.status,
    p_decision: params.decision ?? null,
  });
  if (error) throw error;
  return data;
}

// Cache for program review forms to avoid repeated calls
const reviewFormCache: Map<
  string,
  { data: any; timestamp: number }
> = new Map();
const REVIEW_FORM_CACHE_TTL = 60000; // 1 minute cache

// Reviewer form configuration RPCs
export async function getProgramReviewForm(programId: string) {
  // Check cache first
  const cached = reviewFormCache.get(programId);
  const now = Date.now();
  if (cached && now - cached.timestamp < REVIEW_FORM_CACHE_TTL) {
    return cached.data;
  }

  console.log("Calling get_program_review_form with programId:", programId);
  const { data, error } = await supabase.rpc("get_program_review_form", {
    p_program_id: programId,
  });
  console.log("get_program_review_form result:", { data, error });
  console.log("Form config data details:", JSON.stringify(data, null, 2));
  if (error) throw error;
  
  // Cache the result
  reviewFormCache.set(programId, { data, timestamp: now });
  return data;
}

export async function setProgramReviewForm(programId: string, form: any) {
  console.log("setProgramReviewForm called with:", { programId, form });
  const { data, error } = await supabase.rpc("set_program_review_form", {
    p_program_id: programId,
    p_form: form,
  });
  console.log("setProgramReviewForm result:", { data, error });
  if (error) throw error;
  
  // Update cache with the returned data to avoid future fetches
  // The RPC returns the full program row, extract review_form from metadata
  if (data?.metadata?.review_form) {
    reviewFormCache.set(programId, {
      data: data.metadata.review_form,
      timestamp: Date.now(),
    });
  } else {
    // If for some reason the returned data doesn't have review_form, invalidate cache
    reviewFormCache.delete(programId);
  }
  
  return data;
}
