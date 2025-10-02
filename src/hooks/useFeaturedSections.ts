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

            // Enrich items with detailed data based on target type
            const enrichedItems = await Promise.all(
              (items || []).map(async (item: any) => {
                try {
                  if (item.target_type === "org") {
                    const { data: orgData } = await supabase
                      .from("organizations")
                      .select("name, slug, description")
                      .eq("id", item.target_id)
                      .single();

                    return {
                      ...item,
                      title: item.title || orgData?.name,
                      description: item.description || orgData?.description,
                      org_slug: orgData?.slug,
                    };
                  } else if (item.target_type === "program") {
                    // Use the SAME query as AllPrograms tab - this is what works!
                    const { data: programData } = await supabase
                      .from("programs")
                      .select(
                        `
                        *,
                        organizations(
                          id,
                          name,
                          slug,
                          coalition_memberships(
                            coalition_id,
                            coalitions(
                              name,
                              slug
                            )
                          )
                        )
                      `
                      )
                      .eq("id", item.target_id)
                      .single();

                    if (!programData) {
                      console.error(
                        "No program data found for ID:",
                        item.target_id
                      );
                      return item;
                    }

                    // Handle coalition memberships like AllPrograms does
                    const coalitionMemberships =
                      programData.organizations?.coalition_memberships || [];
                    let coalitionDisplay;
                    if (coalitionMemberships.length === 0) {
                      coalitionDisplay = "Independent";
                    } else if (coalitionMemberships.length === 1) {
                      coalitionDisplay =
                        coalitionMemberships[0]?.coalitions?.name ||
                        "Unknown Coalition";
                    } else {
                      const coalitionNames = coalitionMemberships
                        .map((membership: any) => membership?.coalitions?.name)
                        .filter((name: any) => name)
                        .slice(0, 2);

                      if (coalitionNames.length === 2) {
                        coalitionDisplay = `${coalitionNames[0]}, ${coalitionNames[1]}`;
                      } else {
                        coalitionDisplay = `${coalitionNames[0]} +${
                          coalitionMemberships.length - 1
                        }`;
                      }
                    }

                    return {
                      ...item,
                      title: item.title || programData.name,
                      description: item.description || programData.description,
                      program_type: programData.type,
                      open_at: programData.open_at,
                      close_at: programData.close_at,
                      published: programData.published,
                      slug: programData.slug,
                      // Add organization info for context
                      organization: programData.organizations?.name,
                      organizationSlug: programData.organizations?.slug,
                      coalitionDisplay: coalitionDisplay,
                    };
                  } else if (item.target_type === "coalition") {
                    const { data: coalitionData } = await supabase
                      .from("coalitions")
                      .select("name, slug, description")
                      .eq("id", item.target_id)
                      .single();

                    return {
                      ...item,
                      title: item.title || coalitionData?.name,
                      description:
                        item.description || coalitionData?.description,
                      coalition_slug: coalitionData?.slug,
                    };
                  }

                  return item;
                } catch (err) {
                  console.error(
                    "Failed to fetch detailed data for item:",
                    item.id,
                    err
                  );
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
