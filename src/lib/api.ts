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
// Export cache access for components to check before calling
export function getCachedProgramReviewForm(programId: string) {
  const cached = reviewFormCache.get(programId);
  const now = Date.now();
  if (cached && now - cached.timestamp < REVIEW_FORM_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

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

// Batched version: fetch multiple program review forms in ONE query
export async function getProgramReviewFormsBatch(programIds: string[]) {
  if (programIds.length === 0) return {};
  
  const now = Date.now();
  const uncachedIds: string[] = [];
  const results: Record<string, any> = {};
  
  // Check cache for all programs first
  programIds.forEach((programId) => {
    const cached = reviewFormCache.get(programId);
    if (cached && now - cached.timestamp < REVIEW_FORM_CACHE_TTL) {
      results[programId] = cached.data;
    } else {
      uncachedIds.push(programId);
    }
  });
  
  // Fetch uncached programs in ONE batched query (true batching!)
  if (uncachedIds.length > 0) {
    const { data, error } = await supabase.rpc("get_program_review_forms_batch_v1", {
      p_program_ids: uncachedIds,
    });
    
    if (error) throw error;
    
    // Process results and cache them
    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        reviewFormCache.set(row.program_id, { data: row.review_form, timestamp: now });
        results[row.program_id] = row.review_form;
      });
    }
  }
  
  return results;
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
  
  // Also invalidate program metadata cache since metadata was updated
  invalidateProgramMetadataCache(programId);
  
  return data;
}

// ============================================
// PROGRAM METADATA CACHE (for spots_mode, spots_count, metadata, name)
// ============================================
// Cache for program metadata to avoid repeated fetches
const programMetadataCache: Map<
  string,
  { data: any; timestamp: number }
> = new Map();
const PROGRAM_METADATA_CACHE_TTL = 120000; // 2 minute cache (longer than review forms since metadata changes less frequently)

export type ProgramMetadata = {
  id: string;
  name: string | null;
  metadata: any | null;
  spots_mode: "exact" | "unlimited" | "tbd" | null;
  spots_count: number | null;
};

// Get cached program metadata
export function getCachedProgramMetadata(programId: string): ProgramMetadata | null {
  const cached = programMetadataCache.get(programId);
  const now = Date.now();
  if (cached && now - cached.timestamp < PROGRAM_METADATA_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

// Fetch program metadata (single program) with caching
export async function getProgramMetadata(programId: string): Promise<ProgramMetadata> {
  // Check cache first
  const cached = programMetadataCache.get(programId);
  const now = Date.now();
  if (cached && now - cached.timestamp < PROGRAM_METADATA_CACHE_TTL) {
    return cached.data;
  }

  // Fetch from database
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, metadata, spots_mode, spots_count")
    .eq("id", programId)
    .single();
  
  if (error) throw error;
  if (!data) throw new Error(`Program ${programId} not found`);
  
  // Cache the result
  programMetadataCache.set(programId, { data, timestamp: now });
  return data;
}

// Batched version: fetch multiple program metadata in ONE query with caching
export async function getProgramMetadataBatch(programIds: string[]): Promise<Record<string, ProgramMetadata>> {
  if (programIds.length === 0) return {};
  
  const now = Date.now();
  const uncachedIds: string[] = [];
  const results: Record<string, ProgramMetadata> = {};
  
  // Check cache for all programs first
  programIds.forEach((programId) => {
    const cached = programMetadataCache.get(programId);
    if (cached && now - cached.timestamp < PROGRAM_METADATA_CACHE_TTL) {
      results[programId] = cached.data;
    } else {
      uncachedIds.push(programId);
    }
  });
  
  // Fetch uncached programs in ONE batched query
  if (uncachedIds.length > 0) {
    const { data, error } = await supabase
      .from("programs")
      .select("id, name, metadata, spots_mode, spots_count")
      .in("id", uncachedIds);
    
    if (error) throw error;
    
    // Process results and cache them
    if (data && Array.isArray(data)) {
      data.forEach((row: ProgramMetadata) => {
        programMetadataCache.set(row.id, { data: row, timestamp: now });
        results[row.id] = row;
      });
    }
  }
  
  return results;
}

// Invalidate cache for a program (call after updates)
export function invalidateProgramMetadataCache(programId: string) {
  programMetadataCache.delete(programId);
}
