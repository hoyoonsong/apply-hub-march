import { supabase } from "./supabase";

export interface ProgramAssignment {
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
}

export interface ProgramAssignments {
  reviewers: ProgramAssignment[];
  admins: ProgramAssignment[];
}

// Find user by email
export async function findUserByEmail(email: string) {
  const { data, error } = await supabase.rpc("find_user_by_email", {
    p_email: email,
  });

  if (error) throw error;
  return data && data !== "null" ? data : null;
}

// Add reviewer to program
export async function addProgramReviewer(
  programId: string,
  userEmail: string,
  userName?: string
) {
  const { data, error } = await supabase.rpc("org_add_program_reviewer", {
    p_program_id: programId,
    p_user_email: userEmail,
    p_user_name: userName || null,
  });

  if (error) throw error;
  return data;
}

// Add admin to program
export async function addProgramAdmin(
  programId: string,
  userEmail: string,
  userName?: string
) {
  const { data, error } = await supabase.rpc("org_add_program_admin", {
    p_program_id: programId,
    p_user_email: userEmail,
    p_user_name: userName || null,
  });

  if (error) throw error;
  return data;
}

// Remove reviewer from program
export async function removeProgramReviewer(
  programId: string,
  userEmail: string
) {
  const { data, error } = await supabase.rpc("org_remove_program_reviewer", {
    p_program_id: programId,
    p_user_email: userEmail,
  });

  if (error) throw error;
  return data;
}

// Remove admin from program
export async function removeProgramAdmin(programId: string, userEmail: string) {
  const { data, error } = await supabase.rpc("org_remove_program_admin", {
    p_program_id: programId,
    p_user_email: userEmail,
  });

  if (error) throw error;
  return data;
}

// List all program assignments
export async function listProgramAssignments(
  programId: string
): Promise<ProgramAssignments> {
  const { data, error } = await supabase.rpc("org_list_program_assignments", {
    p_program_id: programId,
  });

  if (error) throw error;
  return data || { reviewers: [], admins: [] };
}
