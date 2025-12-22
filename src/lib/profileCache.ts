import { supabase } from "./supabase";

// Comprehensive profile cache with longer TTL
const profileCache = new Map<
  string,
  { data: { role: string | null; deleted_at: string | null }; timestamp: number }
>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (profile data rarely changes)

/**
 * Get cached profile data (role and deleted_at)
 * This prevents repeated queries for the same user
 */
export async function getCachedProfile(
  userId: string
): Promise<{ role: string | null; deleted_at: string | null } | null> {
  const now = Date.now();
  const cached = profileCache.get(userId);

  // Return cached data if still valid
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, deleted_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    const profileData = {
      role: data?.role || null,
      deleted_at: data?.deleted_at || null,
    };

    // Cache the result
    profileCache.set(userId, { data: profileData, timestamp: now });
    return profileData;
  } catch (error) {
    console.error("Error in getCachedProfile:", error);
    return null;
  }
}

/**
 * Invalidate profile cache for a user (call after profile updates)
 */
export function invalidateProfileCache(userId: string) {
  profileCache.delete(userId);
}

/**
 * Clear all profile cache (useful for testing or logout)
 */
export function clearProfileCache() {
  profileCache.clear();
}

