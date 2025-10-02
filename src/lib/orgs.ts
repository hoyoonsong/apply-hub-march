// src/lib/orgs.ts
import { supabase } from "./supabase";

export type Org = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,slug,description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}
