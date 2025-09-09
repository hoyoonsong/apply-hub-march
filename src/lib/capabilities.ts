import { supabase } from "./supabase";

// Fallback function to check user role from profiles table
export async function getUserRole(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

export type OrgMini = { id: string; name: string; slug: string };
export type CoalitionMini = { id: string; name: string; slug: string };
export type ProgramMini = {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
};

export async function fetchAdminOrgs(): Promise<OrgMini[]> {
  const { data, error } = await supabase.rpc("my_admin_orgs_v1");
  console.log("fetchAdminOrgs result:", { data, error });
  if (error) {
    console.warn("my_admin_orgs_v1 RPC not available:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchCoalitions(): Promise<CoalitionMini[]> {
  const { data, error } = await supabase.rpc("my_coalitions_v1");
  console.log("fetchCoalitions result:", { data, error });
  if (error) {
    console.warn("my_coalitions_v1 RPC not available:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchReviewerPrograms(): Promise<ProgramMini[]> {
  const { data, error } = await supabase.rpc(
    "app_list_my_reviewer_programs_v1"
  );
  console.log("fetchReviewerPrograms result:", { data, error });
  if (error) {
    console.warn(
      "app_list_my_reviewer_programs_v1 RPC not available:",
      error.message
    );
    return [];
  }
  return data ?? [];
}

export type Capabilities = {
  adminOrgs: OrgMini[];
  reviewerPrograms: ProgramMini[];
  coalitions: CoalitionMini[];
  userRole: string | null;
};

export async function loadCapabilities(): Promise<Capabilities> {
  let adminOrgs: OrgMini[] = [];
  let reviewerPrograms: ProgramMini[] = [];
  let coalitions: CoalitionMini[] = [];
  let userRole: string | null = null;
  let rpcsWorking = true;

  try {
    const [adminResult, reviewerProgramsResult, coalitionResult, roleResult] =
      await Promise.all([
        fetchAdminOrgs(),
        fetchReviewerPrograms(),
        fetchCoalitions(),
        getUserRole(),
      ]);

    adminOrgs = adminResult;
    reviewerPrograms = reviewerProgramsResult;
    coalitions = coalitionResult;
    userRole = roleResult;
  } catch (error) {
    console.error("Error loading capabilities:", error);
    rpcsWorking = false;
  }

  console.log("loadCapabilities - final result:", {
    adminOrgs,
    reviewerPrograms,
    coalitions,
    userRole,
    rpcsWorking,
  });

  // Only use fallback data if RPCs are actually not working (error occurred)
  // Don't use fallback when RPCs work but return empty arrays (which is correct when no assignments)
  if (!rpcsWorking && userRole) {
    console.log("RPCs not working, using role-based fallback for testing");

    if (userRole === "admin" || userRole === "superadmin") {
      // For testing: if user is admin, give them access to Demo Corps
      adminOrgs.push({
        id: "demo-corps-id",
        name: "Demo Corps",
        slug: "demo-corps",
      });
    }

    if (userRole === "coalition_manager" || userRole === "superadmin") {
      // For testing: if user is coalition manager, give them access to a test coalition
      coalitions.push({
        id: "test-coalition-id",
        name: "Test Coalition",
        slug: "test-coalition",
      });
    }
  }

  return { adminOrgs, reviewerPrograms, coalitions, userRole };
}

// Helper to check if user has any capabilities
export function hasAnyCapabilities(capabilities: Capabilities): boolean {
  // First check if they have specific assignments
  const hasAssignments =
    capabilities.adminOrgs.length > 0 ||
    capabilities.reviewerPrograms.length > 0 ||
    capabilities.coalitions.length > 0;

  // If they have assignments, return true
  if (hasAssignments) {
    console.log("hasAnyCapabilities - has assignments:", hasAssignments);
    return true;
  }

  // Fallback: check if they have a role that should show capabilities
  const hasRoleBasedCapabilities =
    capabilities.userRole &&
    (capabilities.userRole === "admin" ||
      capabilities.userRole === "reviewer" ||
      capabilities.userRole === "coalition_manager" ||
      capabilities.userRole === "superadmin");

  console.log(
    "hasAnyCapabilities - role-based check:",
    hasRoleBasedCapabilities,
    "role:",
    capabilities.userRole
  );

  return hasRoleBasedCapabilities;
}
