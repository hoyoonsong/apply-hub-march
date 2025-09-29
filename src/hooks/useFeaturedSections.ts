import { useEffect, useState } from "react";
import {
  fetchFeaturedSections,
  fetchFeaturedItemsBySection,
} from "../lib/featuredClient";
import { supabase } from "../lib/supabase";
import type { FeaturedSection, FeaturedItem } from "../types/featured";

export function useFeaturedSections() {
  const [sections, setSections] = useState<
    Array<{ section: FeaturedSection; items: FeaturedItem[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Load ALL sections together to maintain intermingled order
      const allSections = await fetchFeaturedSections();

      const load = (sections: FeaturedSection[]) =>
        Promise.all(
          sections.map(async (s) => {
            const items = await fetchFeaturedItemsBySection(s.id);

            // Enrich items with full data including descriptions, deadlines, etc.
            const enrichedItems = await Promise.all(
              items.map(async (item) => {
                try {
                  if (item.target_type === "org") {
                    const { data: orgData } = await supabase
                      .from("organizations")
                      .select("name, slug")
                      .eq("id", item.target_id)
                      .single();

                    return {
                      ...item,
                      title: item.title || orgData?.name,
                      organization_name: orgData?.name,
                      organization_slug: orgData?.slug,
                    };
                  } else if (item.target_type === "program") {
                    const { data: programData } = await supabase
                      .from("programs")
                      .select(
                        `
                        name, 
                        description, 
                        type, 
                        open_at, 
                        close_at,
                        organization_id,
                        organizations(name, slug)
                      `
                      )
                      .eq("id", item.target_id)
                      .single();

                    return {
                      ...item,
                      title: item.title || programData?.name,
                      description: item.description || programData?.description,
                      program_type: programData?.type,
                      open_at: programData?.open_at,
                      close_at: programData?.close_at,
                      organization_name: programData?.organizations?.name,
                      organization_slug: programData?.organizations?.slug,
                    };
                  } else if (item.target_type === "coalition") {
                    const { data: coalitionData } = await supabase
                      .from("coalitions")
                      .select("name, slug")
                      .eq("id", item.target_id)
                      .single();

                    return {
                      ...item,
                      title: item.title || coalitionData?.name,
                      coalition_name: coalitionData?.name,
                      coalition_slug: coalitionData?.slug,
                    };
                  }

                  return item;
                } catch (err) {
                  console.error("Failed to fetch data for item:", item.id, err);
                  return item;
                }
              })
            );

            return {
              section: s,
              items: enrichedItems,
            };
          })
        );

      const sectionsData = await load(allSections);

      if (!cancelled) {
        // Filter out sections with no items and maintain order
        setSections(sectionsData.filter((s) => s.items.length));
        setLoading(false);
      }
    })().catch(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  // Separate carousels and galleries for backward compatibility
  const carousels = sections.filter(
    (s) => s.section.section_type === "carousel"
  );
  const galleries = sections.filter(
    (s) => s.section.section_type === "gallery"
  );

  return { sections, carousels, galleries, loading };
}
