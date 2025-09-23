// src/lib/programs.ts
import { supabase } from "../lib/supabase";
import type { ProgramApplicationSchema } from "../types/application";

export type ReviewStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "unpublished"
  | "published"
  | "pending_changes";

export type Program = {
  id: string;
  organization_id: string;
  name: string;
  type: "audition" | "scholarship" | "application" | "competition";
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
  deleted_at: string | null;
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
    "published",
    "pending_changes",
  ];
  return (
    allowed.includes(raw as ReviewStatus) ? raw : "draft"
  ) as ReviewStatus;
}

export function getProgramRowReviewStatus(p?: ProgramRow | null): ReviewStatus {
  const meta = (p?.metadata ?? {}) as any;
  const raw =
    typeof meta?.review_status === "string" ? meta.review_status : "draft";
  const allowed: ReviewStatus[] = [
    "draft",
    "submitted",
    "changes_requested",
    "approved",
    "unpublished",
    "published",
    "pending_changes",
  ];
  return (
    allowed.includes(raw as ReviewStatus) ? raw : "draft"
  ) as ReviewStatus;
}

/* ========== Admin-side RPCs ========== */

export type ProgramRow = {
  id: string;
  name: string;
  type: "audition" | "scholarship" | "application" | "competition" | string;
  description: string | null;
  open_at: string | null;
  close_at: string | null;
  published: boolean;
  published_scope: "org" | "coalition" | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any | null;
  deleted_at?: string | null;
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
  type: "audition" | "scholarship" | "application" | "competition";
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
  type: "audition" | "scholarship" | "application" | "competition";
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

  // Filter out soft-deleted programs
  const filteredData = (data ?? []).filter(
    (program: any) => !program.deleted_at
  );

  return filteredData as Program[];
}

export async function superReviewProgram(args: {
  program_id: string;
  action: "approve" | "request_changes";
  note?: string | null;
}): Promise<Program> {
  const { data, error } = await supabase.rpc("super_review_program_v3", {
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
  const { data, error } = await supabase.rpc("super_publish_program_v2", {
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
  type?: "audition" | "scholarship" | "application" | "competition";
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

/* ========== Application Builder Types and RPCs ========== */

export type BuilderField = {
  id: string;
  type: "short_text" | "long_text" | "date" | "select" | "checkbox" | "file";
  label: string;
  required?: boolean;
  options?: string[];
  max?: number;
  maxWords?: number;
};

export type ProgramApplicationDraft = {
  builderVersion: 1;
  fields: BuilderField[];
};

export async function orgSaveProgramForm(params: {
  programId: string;
  draft: ProgramApplicationDraft;
  includeHub: boolean;
  includeCoalition: boolean;
  coalitionId?: string | null;
}) {
  const { data, error } = await supabase.rpc("org_save_program_form_v1", {
    p_program_id: params.programId,
    p_application_draft: params.draft as any,
    p_include_hub_common: params.includeHub,
    p_include_coal_common: params.includeCoalition,
    p_coalition_id: params.coalitionId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function cmSaveProgramForm(params: {
  programId: string;
  draft: ProgramApplicationDraft;
  includeHub: boolean;
  includeCoalition: boolean;
}) {
  const { data, error } = await supabase.rpc("cm_save_program_form_v1", {
    p_program_id: params.programId,
    p_application_draft: params.draft as any,
    p_include_hub_common: params.includeHub,
    p_include_coal_common: params.includeCoalition,
  });
  if (error) throw error;
  return data;
}

export async function requestProgramPublish(params: {
  programId: string;
  scope: "org" | "coalition";
  coalitionId?: string | null;
  note?: string | null;
}) {
  const { data, error } = await supabase.rpc("request_program_publish_v1", {
    p_program_id: params.programId,
    p_publish_scope: params.scope,
    p_coalition_id: params.coalitionId ?? null,
    p_note: params.note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function getHubCommonTemplate() {
  const { data, error } = await supabase.rpc("hub_common_app_template_v1");
  if (error) throw error;
  return data as any;
}

export async function getCoalitionTemplate(coalitionId: string) {
  const { data, error } = await supabase.rpc(
    "cm_get_coalition_app_template_v1",
    {
      p_coalition_id: coalitionId,
    }
  );
  if (error) throw error;
  return data as any;
}

/* ========== New Application Builder RPCs ========== */

export async function saveBuilder(
  programId: string,
  schema: ProgramApplicationSchema
) {
  const { data, error } = await supabase.rpc("app_builder_save_v1", {
    p_program_id: programId,
    p_schema: schema as any,
  });
  if (error) throw error;
  return data;
}

export async function saveBuilderSchema(programId: string, schema: any) {
  const { data, error } = await supabase.rpc("app_builder_save_v1", {
    p_program_id: programId,
    p_schema: schema,
  });
  if (error) throw error;
  return data;
}

export async function submitForReview(
  programId: string,
  scope: "org" | "coalition",
  coalitionId?: string,
  note?: string
) {
  const { data, error } = await supabase.rpc("request_program_publish_v1", {
    p_program_id: programId,
    p_publish_scope: scope,
    p_coalition_id: coalitionId ?? null,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function fetchPublicProgram(programId: string) {
  const { data, error } = await supabase
    .from("programs_public")
    .select(
      "id,name,type,description,open_at,close_at,published,published_scope,published_at,published_coalition_id,organization_id,organization_name,organization_slug,coalition_name,coalition_slug,application_schema"
    )
    .eq("id", programId)
    .single();

  if (error) throw error;
  return data;
}

// Keep the old function for backward compatibility
export async function getPublicProgram(programId: string) {
  return fetchPublicProgram(programId);
}

export async function startOrContinueApplication(programId: string) {
  const { data, error } = await supabase.rpc(
    "app_start_or_get_application_v1",
    {
      p_program_id: programId,
    }
  );
  if (error) throw error;
  return data as {
    id: string;
    program_id: string;
    user_id: string;
    status: string;
    answers: any;
  };
}

export async function getPublicProgramById(supabase: any, id: string) {
  return supabase
    .from("programs_public")
    .select(
      [
        "id",
        "organization_id",
        "name",
        "type",
        "description",
        "metadata",
        "published",
        "published_scope",
        "published_coalition_id",
        "open_at",
        "close_at",
        "created_at",
        "updated_at",
        "published_at",
      ].join(",")
    )
    .eq("id", id)
    .maybeSingle();
}
