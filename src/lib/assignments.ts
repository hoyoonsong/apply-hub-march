import { supabase } from "./supabase";

export async function listUserAssignments(userId: string) {
  const { data, error } = await supabase.rpc("super_list_user_assignments_v1", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listAllOrgs() {
  const { data, error } = await supabase.rpc("super_list_orgs_v1", {
    include_deleted: false,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listProgramsByOrg(orgId: string) {
  const { data, error } = await supabase.rpc("super_list_programs_v1", {
    p_org_id: orgId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listAllCoalitions() {
  const { data, error } = await supabase.rpc("super_list_coalitions_v1", {
    include_deleted: false,
  });
  if (error) throw error;
  return data ?? [];
}

export async function upsertOrgAdmin(
  orgId: string,
  userId: string,
  status: "active" | "revoked"
) {
  const { error } = await supabase.rpc("super_upsert_org_admin_v1", {
    p_org_id: orgId,
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}

export async function upsertReviewer(
  scopeType: "org" | "program",
  scopeId: string,
  userId: string,
  status: "active" | "revoked"
) {
  // Use the wrapper signature: (p_scope_id, p_scope_type, p_status, p_user_id)
  const { error } = await supabase.rpc("super_upsert_reviewer_v1", {
    p_scope_id: scopeId,
    p_scope_type: scopeType,
    p_status: status,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function upsertCoalitionManager(
  coalitionId: string,
  userId: string,
  status: "active" | "revoked"
) {
  const { error } = await supabase.rpc("super_upsert_coalition_manager_v1", {
    p_coalition_id: coalitionId,
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}

export async function updateUserRoleV2(
  userId: string,
  newRole: string,
  wipe: boolean,
  target: "all" | "admin" | "reviewer" | "coalition" = "all"
) {
  const { error } = await supabase.rpc("super_update_user_role_v2", {
    p_user_id: userId,
    p_new_role: newRole,
    p_wipe: wipe,
    p_target: target,
  });
  if (error) throw error;
}

// Cache for effective roles to avoid repeated calls
const effectiveRolesCache: Map<
  string,
  { data: any; timestamp: number }
> = new Map();
const EFFECTIVE_ROLES_CACHE_TTL = 30000; // 30 seconds cache

export async function getEffectiveRoles(userId: string) {
  // Check cache first
  const cached = effectiveRolesCache.get(userId);
  const now = Date.now();
  if (cached && now - cached.timestamp < EFFECTIVE_ROLES_CACHE_TTL) {
    return cached.data;
  }

  const { data, error } = await supabase.rpc("super_user_effective_roles_v1", {
    p_user_id: userId,
  });
  if (error) throw error;
  const result = (data ?? {}) as {
    superadmin_from_profile: boolean;
    has_admin: boolean;
    has_reviewer: boolean;
    has_co_manager: boolean;
  };
  
  // Cache the result
  effectiveRolesCache.set(userId, { data: result, timestamp: now });
  return result;
}
