import { supabase } from "../lib/supabase";
import type { FeaturedSection, FeaturedItem } from "../types/featured";

export async function fetchFeaturedSections(type?: "carousel" | "gallery") {
  const { data, error } = await supabase.rpc<FeaturedSection>(
    "featured_sections_public",
    { p_type: type ?? null }
  );

  if (error) throw error;
  return data ?? [];
}

export async function fetchFeaturedItemsBySection(sectionId: string) {
  const { data, error } = await supabase.rpc<FeaturedItem>(
    "featured_by_section_public",
    { p_section_id: sectionId }
  );

  if (error) throw error;
  return data ?? [];
}
