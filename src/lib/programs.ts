// src/lib/programs.ts
import { supabase } from "../lib/supabase";

export type ReviewStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "unpublished";

export type Program = {
  id: string;
  organization_id: string;
  name: string;
  type: "audition" | "scholarship";
  description: string | null;
  open_at: string | null;
  close_at: string | null;
  metadata: any | null;
  published: boolean;
  published_scope: "org" | "coalition" | null;
  published_by: string | null;
  published_at: string | null;
  published_coalition_id: string | null;
  created_at: string;
  updated_at: string;
};

export function getReviewStatus(p?: Program | null): ReviewStatus {
  const meta = (p?.metadata ?? {}) as any;
  const raw =
    typeof meta?.review_status === "string" ? meta.review_status : "draft";
  const allowed: ReviewStatus[] = [
    "draft",
    "submitted",
    "changes_requested",
    "approved",
    "unpublished",
  ];
  return (
    allowed.includes(raw as ReviewStatus) ? raw : "draft"
  ) as ReviewStatus;
}

/* ========== Admin-side RPCs ========== */

export type ProgramRow = {
  id: string;
  name: string;
  type: "audition" | "scholarship" | string;
  description: string | null;
  open_at: string | null;
  close_at: string | null;
  published: boolean;
  published_scope: "org" | "coalition" | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function adminListMyPrograms(): Promise<Program[]> {
  const { data, error } = await supabase.rpc("admin_list_my_programs_v1");
  if (error) throw new Error(error.message);
  return (data ?? []) as Program[];
}

export async function listOrgPrograms(orgId: string): Promise<ProgramRow[]> {
  const { data, error } = await supabase.rpc("admin_list_org_programs_v1", {
    p_org_id: orgId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function orgCreateProgramDraft(args: {
  organization_id: string;
  name: string;
  type: "audition" | "scholarship";
  description?: string;
  open_at?: string | null;
  close_at?: string | null;
  metadata?: any;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("org_create_program_draft_v1", {
    p_org_id: args.organization_id,
    p_name: args.name,
    p_type: args.type,
    p_description: args.description ?? null,
    p_open_at: args.open_at ?? null,
    p_close_at: args.close_at ?? null,
    p_metadata: args.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return data as Program;
}

export async function orgUpdateProgramDraft(args: {
  program_id: string;
  name: string;
  type: "audition" | "scholarship";
  description?: string;
  open_at?: string | null;
  close_at?: string | null;
  metadata?: any;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("org_update_program_draft_v1", {
    p_program_id: args.program_id,
    p_name: args.name,
    p_type: args.type,
    p_description: args.description ?? null,
    p_open_at: args.open_at ?? null,
    p_close_at: args.close_at ?? null,
    p_metadata: args.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return data as Program;
}

export async function orgSubmitProgramForReview(args: {
  program_id: string;
  note?: string | null;
}): Promise<Program> {
  const { data, error } = await supabase.rpc(
    "org_submit_program_for_review_v1",
    {
      p_program_id: args.program_id,
      p_note: args.note ?? null,
    }
  );
  if (error) throw new Error(error.message);
  return data as Program;
}

/* ========== Super-side RPCs ========== */

export async function superListProgramSubmissions(
  status?: ReviewStatus | null
): Promise<Program[]> {
  const { data, error } = await supabase.rpc(
    "super_list_program_submissions_v1",
    {
      p_status: status ?? null,
    }
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as Program[];
}

export async function superReviewProgram(args: {
  program_id: string;
  action: "approve" | "request_changes";
  note?: string | null;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("super_review_program_v1", {
    p_program_id: args.program_id,
    p_action: args.action,
    p_note: args.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as Program;
}

export async function superPublishProgram(args: {
  program_id: string;
  scope: "org" | "coalition";
  coalition_id?: string | null;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("super_publish_program_v1", {
    p_program_id: args.program_id,
    p_scope: args.scope,
    p_coalition_id:
      args.scope === "coalition" ? args.coalition_id ?? null : null,
  });
  if (error) throw new Error(error.message);
  return data as Program;
}

export async function superUnpublishProgram(args: {
  program_id: string;
  note?: string | null;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("super_unpublish_program_v1", {
    p_program_id: args.program_id,
    p_note: args.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as Program;
}

/* ========== Public list (optional) ========== */

export async function publicListPrograms(params?: {
  type?: "audition" | "scholarship";
  search?: string;
  coalition_id?: string | null;
  limit?: number;
  offset?: number;
}): Promise<Program[]> {
  const { data, error } = await supabase.rpc("public_list_programs_v1", {
    p_type: params?.type ?? null,
    p_search: params?.search ?? null,
    p_coalition_id: params?.coalition_id ?? null,
    p_limit: params?.limit ?? 100,
    p_offset: params?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Program[];
}
