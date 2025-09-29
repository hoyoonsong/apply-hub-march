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

            // Enrich items with actual names if title is not available
            const enrichedItems = await Promise.all(
              items.map(async (item) => {
                if (item.title) {
                  return item; // Already has title
                }

                try {
                  let name = null;
                  if (item.target_type === "org") {
                    const { data: orgData } = await supabase
                      .from("organizations")
                      .select("name")
                      .eq("id", item.target_id)
                      .single();
                    name = orgData?.name;
                  } else if (item.target_type === "program") {
                    const { data: programData } = await supabase
                      .from("programs")
                      .select("name")
                      .eq("id", item.target_id)
                      .single();
                    name = programData?.name;
                  } else if (item.target_type === "coalition") {
                    const { data: coalitionData } = await supabase
                      .from("coalitions")
                      .select("name")
                      .eq("id", item.target_id)
                      .single();
                    name = coalitionData?.name;
                  }

                  return { ...item, title: name };
                } catch (err) {
                  console.error("Failed to fetch name for item:", item.id, err);
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
