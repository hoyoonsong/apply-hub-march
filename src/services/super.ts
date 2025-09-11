import { supabase } from "../lib/supabase";

export async function listOrgs(includeDeleted = false) {
  const { data, error } = await supabase.rpc("super_list_orgs_v1", {
    include_deleted: includeDeleted,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listCoalitions(includeDeleted = false) {
  const { data, error } = await supabase.rpc("super_list_coalitions_v1", {
    include_deleted: includeDeleted,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listPrograms(includeDeleted = false) {
  const { data, error } = await supabase.rpc("super_list_programs_v1", {
    include_deleted: includeDeleted,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listCoalitionMembers(coalitionId: string) {
  const { data, error } = await supabase.rpc(
    "super_list_coalition_members_v1",
    { p_coalition_id: coalitionId }
  );
  if (error) throw error;
  return data ?? [];
}

export async function createProgram(input: {
  orgId: string;
  name: string;
  type: "audition" | "scholarship";
  description?: string;
  openAt?: string | null; // ISO string or null
  closeAt?: string | null; // ISO string or null
  published?: boolean;
}) {
  const { data, error } = await supabase.rpc("super_create_program_v1", {
    p_org_id: input.orgId,
    p_name: input.name,
    p_type: input.type,
    p_description: input.description ?? null,
    p_open_at: input.openAt ?? null,
    p_close_at: input.closeAt ?? null,
    p_published: !!input.published,
  });
  if (error) throw error;
  return data;
}

// Programs soft-delete
export async function softDeleteProgram(params: { p_program_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_program_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function restoreProgram(params: { p_program_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_restore_program_v1",
    params
  );
  if (error) throw error;
  return data;
}

// Keep existing RPCs for orgs and coalitions
export async function createOrg(params: {
  p_name: string;
  p_slug: string;
  p_description?: string;
}) {
  const { data, error } = await supabase.rpc("super_create_org_v1", params);
  if (error) throw error;
  return data;
}

export async function softDeleteOrg(params: { p_org_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_org_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function restoreOrg(params: { p_org_id: string }) {
  const { data, error } = await supabase.rpc("super_restore_org_v1", params);
  if (error) throw error;
  return data;
}

export async function createCoalition(params: {
  p_name: string;
  p_slug: string;
  p_description?: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_create_coalition_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function softDeleteCoalition(params: { p_coalition_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_coalition_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function restoreCoalition(params: { p_coalition_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_restore_coalition_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function addOrgToCoalition(params: {
  p_coalition_id: string;
  p_org_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_add_org_to_coalition_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function removeOrgFromCoalition(params: {
  p_coalition_id: string;
  p_org_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_remove_org_from_coalition_v1",
    params
  );
  if (error) throw error;
  return data;
}

// Users soft-delete
export async function listUsers(opts: {
  search?: string | null;
  role?: string | null;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { data, error } = await supabase.rpc("super_list_users_v1", {
    p_search: opts.search ?? null,
    p_role_filter: opts.role ?? null,
    p_limit: opts.limit ?? 1000,
    p_offset: opts.offset ?? 0,
    include_deleted: !!opts.includeDeleted,
  });
  if (error) throw error;
  return data ?? [];
}

export async function softDeleteUser(params: { p_user_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_user_v1",
    params
  );
  if (error) throw error;
  return data;
}

export async function restoreUser(params: { p_user_id: string }) {
  const { data, error } = await supabase.rpc("super_restore_user_v1", params);
  if (error) throw error;
  return data;
}

// Error handling helper
export function isBackendUpdatingError(error: any): boolean {
  return error?.code === "PGRST302" || error?.status === 404;
}
