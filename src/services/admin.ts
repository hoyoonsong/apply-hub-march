import { supabase } from "../lib/supabase";

export async function adminListPrograms(orgId: string, includeDeleted = false) {
  console.log(
    "Loading programs for org:",
    orgId,
    "includeDeleted:",
    includeDeleted
  );

  // Use direct Supabase query to get programs with deleted_at field
  let query = supabase
    .from("programs")
    .select(
      `
      id,
      organization_id,
      name,
      type,
      description,
      open_at,
      close_at,
      metadata,
      published,
      published_scope,
      published_by,
      published_at,
      published_coalition_id,
      created_at,
      updated_at,
      deleted_at
    `
    )
    .eq("organization_id", orgId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  // Order by most recently updated first
  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  console.log("Direct query result:", { data, error });

  if (error) {
    console.error("Query error:", error);
    throw error;
  }

  console.log("Programs found:", data);
  return data ?? [];
}

export async function adminSoftDeleteProgram(p_program_id: string) {
  console.log("Attempting to soft delete program:", p_program_id);

  // Use direct Supabase update to set deleted_at timestamp
  const { data, error } = await supabase
    .from("programs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", p_program_id)
    .select();

  console.log("Soft delete result:", { data, error });

  if (error) {
    console.error("Soft delete error:", error);
    throw error;
  }
  return data;
}

export async function adminRestoreProgram(p_program_id: string) {
  console.log("Attempting to restore program:", p_program_id);

  // Use direct Supabase update to clear deleted_at timestamp
  const { data, error } = await supabase
    .from("programs")
    .update({ deleted_at: null })
    .eq("id", p_program_id)
    .select();

  console.log("Restore result:", { data, error });

  if (error) {
    console.error("Restore error:", error);
    throw error;
  }
  return data;
}

export async function adminUpdateProgramBasics(
  p_program_id: string,
  updates: {
    name?: string;
    description?: string | null;
    open_at?: string | null;
    close_at?: string | null;
  }
) {
  const payload: Record<string, any> = {};
  if (typeof updates.name !== "undefined") payload.name = updates.name;
  if (typeof updates.description !== "undefined")
    payload.description = updates.description;
  if (typeof updates.open_at !== "undefined") payload.open_at = updates.open_at;
  if (typeof updates.close_at !== "undefined")
    payload.close_at = updates.close_at;

  const { data, error } = await supabase
    .from("programs")
    .update(payload)
    .eq("id", p_program_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
