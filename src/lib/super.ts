import { supabase } from "./supabase";

// Organizations RPCs
export async function superListOrgsV1(includeDeleted: boolean = false) {
  const { data, error } = await supabase.rpc("super_list_orgs_v1", {
    include_deleted: includeDeleted,
  });
  if (error) throw new Error(`Failed to list organizations: ${error.message}`);
  return data;
}

export async function superCreateOrgV1(params: {
  p_name: string;
  p_slug: string;
  p_description?: string;
}) {
  const { data, error } = await supabase.rpc("super_create_org_v1", params);
  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  return data;
}

export async function superSoftDeleteOrgV1(params: { p_org_id: string }) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_org_v1",
    params
  );
  if (error)
    throw new Error(`Failed to soft delete organization: ${error.message}`);
  return data;
}

export async function superRestoreOrgV1(params: { p_org_id: string }) {
  const { data, error } = await supabase.rpc("super_restore_org_v1", params);
  if (error)
    throw new Error(`Failed to restore organization: ${error.message}`);
  return data;
}

export async function superUpsertOrgAdminV1(params: {
  p_org_id: string;
  p_user_id: string;
  p_status: "active" | "revoked" | "inactive";
}) {
  const { data, error } = await supabase.rpc(
    "super_upsert_org_admin_v1",
    params
  );
  if (error) throw new Error(`Failed to upsert org admin: ${error.message}`);
  return data;
}

// Programs - using direct table access for now
export async function listPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(
      `
      *,
      organizations!programs_organization_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list programs: ${error.message}`);
  return data;
}

export async function createProgram(params: {
  organization_id: string;
  name: string;
  type: "audition" | "scholarship";
  description?: string;
  open_at?: string;
  close_at?: string;
  published?: boolean;
}) {
  const { data, error } = await supabase
    .from("programs")
    .insert([params])
    .select(
      `
      *,
      organizations!programs_organization_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .single();
  if (error) throw new Error(`Failed to create program: ${error.message}`);
  return data;
}

export async function updateProgram(
  id: string,
  params: {
    name?: string;
    type?: "audition" | "scholarship";
    description?: string;
    open_at?: string;
    close_at?: string;
    published?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("programs")
    .update(params)
    .eq("id", id)
    .select(
      `
      *,
      organizations!programs_organization_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .single();
  if (error) throw new Error(`Failed to update program: ${error.message}`);
  return data;
}

// Coalitions RPCs
export async function superListCoalitionsV1(includeDeleted: boolean = false) {
  const { data, error } = await supabase.rpc("super_list_coalitions_v1", {
    include_deleted: includeDeleted,
  });
  if (error) throw new Error(`Failed to list coalitions: ${error.message}`);
  return data;
}

export async function superCreateCoalitionV1(params: {
  p_name: string;
  p_slug: string;
  p_description?: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_create_coalition_v1",
    params
  );
  if (error) throw new Error(`Failed to create coalition: ${error.message}`);
  return data;
}

export async function superSoftDeleteCoalitionV1(params: {
  p_coalition_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_soft_delete_coalition_v1",
    params
  );
  if (error)
    throw new Error(`Failed to soft delete coalition: ${error.message}`);
  return data;
}

export async function superRestoreCoalitionV1(params: {
  p_coalition_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_restore_coalition_v1",
    params
  );
  if (error) throw new Error(`Failed to restore coalition: ${error.message}`);
  return data;
}

export async function superUpsertCoalitionManagerV1(params: {
  p_coalition_id: string;
  p_user_id: string;
  p_status: "active" | "revoked" | "inactive";
}) {
  const { data, error } = await supabase.rpc(
    "super_upsert_coalition_manager_v1",
    params
  );
  if (error)
    throw new Error(`Failed to upsert coalition manager: ${error.message}`);
  return data;
}

export async function superAddOrgToCoalitionV1(params: {
  p_coalition_id: string;
  p_org_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_add_org_to_coalition_v1",
    params
  );
  if (error)
    throw new Error(
      `Failed to add organization to coalition: ${error.message}`
    );
  return data;
}

export async function superRemoveOrgFromCoalitionV1(params: {
  p_coalition_id: string;
  p_org_id: string;
}) {
  const { data, error } = await supabase.rpc(
    "super_remove_org_from_coalition_v1",
    params
  );
  if (error)
    throw new Error(
      `Failed to remove organization from coalition: ${error.message}`
    );
  return data;
}

// Helper function to get coalition members
export async function getCoalitionMembers(coalitionId: string) {
  const { data, error } = await supabase
    .from("coalition_memberships")
    .select(
      `
      *,
      organizations!coalition_memberships_organization_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .eq("coalition_id", coalitionId);
  if (error)
    throw new Error(`Failed to get coalition members: ${error.message}`);
  return data;
}
