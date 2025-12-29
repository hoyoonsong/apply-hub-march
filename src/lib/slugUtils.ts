import { supabase } from "./supabase";

/**
 * Slugify a string: lowercase, replace non-alphanumeric with hyphens, trim
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * Check if a slug already exists in the organizations table
 * Checks all organizations including soft-deleted ones for true uniqueness
 */
export async function slugExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle(); // Use maybeSingle instead of single to avoid error on no match

  // If we get data, slug exists
  if (data) return true;
  
  // If no data and no error, slug doesn't exist
  if (!error) return false;
  
  // For errors, log but assume it doesn't exist (safer for creation)
  // The database constraint will catch duplicates during actual creation
  console.warn("Error checking slug existence:", error);
  return false;
}

/**
 * Generate a unique slug from an organization name
 * If the base slug exists, appends numbers (1, 2, 3, etc.) until unique
 */
export async function generateUniqueSlug(orgName: string): Promise<string> {
  const baseSlug = slugify(orgName);
  
  // If base slug is empty (e.g., all special chars), use "organization"
  if (!baseSlug) {
    return await findNextAvailableSlug("organization");
  }
  
  // Check if base slug is available
  if (!(await slugExists(baseSlug))) {
    return baseSlug;
  }
  
  // Find next available slug with number suffix
  return await findNextAvailableSlug(baseSlug);
}

/**
 * Find the next available slug by appending numbers
 */
async function findNextAvailableSlug(baseSlug: string): Promise<string> {
  let counter = 1;
  let candidate = `${baseSlug}-${counter}`;
  
  while (await slugExists(candidate)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error("Unable to generate unique slug after 1000 attempts");
    }
  }
  
  return candidate;
}


