import { supabase } from "./supabase";

// Organization cache by slug
const orgCache = new Map<
  string,
  { data: { id: string; name: string; slug: string; description: string | null }; timestamp: number }
>();
const ORG_CACHE_TTL = 10 * 60 * 1000; // 10 minutes (org data rarely changes)

/**
 * Get organization by slug with caching
 * Prevents repeated queries for the same organization
 */
export async function getOrgBySlugCached(
  slug: string
): Promise<{ id: string; name: string; slug: string; description: string | null } | null> {
  const now = Date.now();
  const cached = orgCache.get(slug);

  // Return cached data if still valid
  if (cached && now - cached.timestamp < ORG_CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, description")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error("Error fetching organization:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    const orgData = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
    };

    // Cache the result
    orgCache.set(slug, { data: orgData, timestamp: now });
    return orgData;
  } catch (error) {
    console.error("Error in getOrgBySlugCached:", error);
    return null;
  }
}

/**
 * Invalidate organization cache for a slug (call after org updates)
 */
export function invalidateOrgCache(slug: string) {
  orgCache.delete(slug);
}

/**
 * Clear all organization cache (useful for testing)
 */
export function clearOrgCache() {
  orgCache.clear();
}

