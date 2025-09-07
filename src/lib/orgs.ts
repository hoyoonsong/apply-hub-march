// src/lib/orgs.ts
import { supabase } from "./supabase";

export type Org = {
  id: string;
  name: string;
  slug: string;
};

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}
