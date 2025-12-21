import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// Cache for user role to avoid repeated queries
let userRoleCache: {
  role: string | null;
  userId: string | null;
  timestamp: number;
} = { role: null, userId: null, timestamp: 0 };
const ROLE_CACHE_TTL = 30000; // 30 seconds cache (role rarely changes)

// Cache for getUser() results to avoid excessive auth API calls
let userCache: {
  user: any | null;
  timestamp: number;
} = { user: null, timestamp: 0 };
const USER_CACHE_TTL = 60000; // 1 minute cache (user rarely changes during session)

// Request deduplication: track in-flight getUser() requests
let getUserPromise: Promise<{ user: any | null }> | null = null;

// Deduplicated getUser() function - prevents concurrent calls
// Exported so other modules can use it instead of direct supabase.auth.getUser()
export async function getUserWithDeduplication(): Promise<{ user: any | null }> {
  const now = Date.now();
  
  // If we have a valid cached user, return it immediately
  if (userCache.user && now - userCache.timestamp < USER_CACHE_TTL) {
    return { user: userCache.user };
  }
  
  // If there's an in-flight request, reuse it
  if (getUserPromise) {
    return getUserPromise;
  }
  
  // Create new request and cache the promise
  getUserPromise = (async () => {
    try {
      const {
        data: { user: fetchedUser },
        error,
      } = await supabase.auth.getUser();
      
      const user = error ? null : fetchedUser;
      userCache = { user, timestamp: Date.now() };
      return { user };
    } catch (error) {
      console.error("Error in getUserWithDeduplication:", error);
      userCache = { user: null, timestamp: Date.now() };
      return { user: null };
    } finally {
      // Clear the promise so future calls can make new requests if cache expires
      getUserPromise = null;
    }
  })();
  
  return getUserPromise;
}

// Fallback function to check user role from profiles table
export async function getUserRole(): Promise<string | null> {
  try {
    // Use deduplicated getUser() to prevent concurrent API calls
    const { user } = await getUserWithDeduplication();
    
    if (!user) return null;
    
    const now = Date.now();
    
    if (!user) return null;

    // Check cache first (reuse 'now' from above)
    if (
      userRoleCache.userId === user.id &&
      now - userRoleCache.timestamp < ROLE_CACHE_TTL
    ) {
      return userRoleCache.role;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, deleted_at")
      .eq("id", user.id)
      .single();

    // If user is deleted, return null to deny access
    if (profile?.deleted_at) {
      console.log("User is soft deleted, denying access");
      userRoleCache = { role: null, userId: user.id, timestamp: now };
      return null;
    }

    const role = profile?.role || null;
    // Update cache
    userRoleCache = { role, userId: user.id, timestamp: now };
    return role;
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
  const { data, error } = await supabase.rpc("my_reviewer_programs_v2");
  console.log("fetchReviewerPrograms result:", { data, error });
  if (error) {
    console.warn("my_reviewer_programs_v2 RPC not available:", error.message);
    return [];
  }
  const allProgs = data ?? [];
  // Filter out deleted programs - optimized: get non-deleted in one query
  if (allProgs.length > 0) {
    const programIds = allProgs.map((p: any) => p.program_id || p.id);
    // Get only non-deleted program IDs in a single query
    const { data: nonDeletedPrograms } = await supabase
      .from("programs")
      .select("id")
      .in("id", programIds)
      .is("deleted_at", null);
    const nonDeletedIds = new Set(
      (nonDeletedPrograms || []).map((p: any) => p.id)
    );
    return allProgs.filter((p: any) =>
      nonDeletedIds.has(p.program_id || p.id)
    );
  }
  return allProgs;
}

export type Capabilities = {
  adminOrgs: OrgMini[];
  reviewerPrograms: ProgramMini[];
  coalitions: CoalitionMini[];
  userRole: string | null;
};

export function hasReviewerAssignments(caps: Capabilities | null | undefined) {
  if (!caps) return false;
  return (caps.reviewerPrograms?.length ?? 0) > 0;
}

export function isAdmin(caps: Capabilities | null | undefined) {
  if (!caps) return false;
  return (caps.adminOrgs?.length ?? 0) > 0;
}

export function useCapabilities() {
  const [adminOrgs, setAdminOrgs] = useState<OrgMini[]>([]);
  const [reviewerPrograms, setReviewerPrograms] = useState<ProgramMini[]>([]);
  const [coalitions, setCoalitions] = useState<CoalitionMini[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCaps = async () => {
      try {
        const caps = await loadCapabilities();
        setAdminOrgs(caps.adminOrgs);
        setReviewerPrograms(caps.reviewerPrograms);
        setCoalitions(caps.coalitions);
        setUserRole(caps.userRole);
      } catch (error) {
        console.error("Failed to load capabilities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCaps();
  }, []);

  const hasReviewerAssignments = (reviewerPrograms?.length ?? 0) > 0;
  const isOrgAdmin = (adminOrgs?.length ?? 0) > 0;
  const isSuperAdmin = userRole === "admin" || userRole === "superadmin";

  return {
    adminOrgs,
    reviewerPrograms,
    coalitions,
    userRole,
    hasReviewerAssignments,
    isOrgAdmin,
    isSuperAdmin,
    loading,
  };
}

// Simple cache to prevent duplicate simultaneous calls
let capabilitiesCache: {
  promise: Promise<Capabilities> | null;
  timestamp: number;
} = { promise: null, timestamp: 0 };
const CACHE_TTL = 5000; // 5 seconds cache

export async function loadCapabilities(): Promise<Capabilities> {
  const now = Date.now();
  
  // If there's a recent cached promise, reuse it
  if (
    capabilitiesCache.promise &&
    now - capabilitiesCache.timestamp < CACHE_TTL
  ) {
    return capabilitiesCache.promise;
  }

  // Create new promise and cache it
  const promise = (async () => {
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
  })();

  capabilitiesCache = { promise, timestamp: now };
  return promise;
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
    typeof capabilities.userRole === "string" &&
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

  return Boolean(hasRoleBasedCapabilities);
}
