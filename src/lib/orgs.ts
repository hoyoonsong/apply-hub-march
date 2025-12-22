// src/lib/orgs.ts
import { supabase } from "./supabase";
import { getOrgBySlugCached } from "./orgCache";

export type Org = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  // Use cached version to prevent repeated queries
  return getOrgBySlugCached(slug);
}
