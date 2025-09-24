import { supabase } from "./supabase";

// Assign an org admin as reviewer for all programs in their org
export async function assignOrgAdminAsReviewer(orgId: string, userId: string) {
  const { data, error } = await supabase.rpc("assign_org_admin_as_reviewer", {
    p_org_id: orgId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}
