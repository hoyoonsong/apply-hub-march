import { useEffect, useState } from "react";
import {
  fetchFeaturedSections,
  fetchFeaturedItemsBySection,
} from "../lib/featuredClient";
import { supabase } from "../lib/supabase";
import type { FeaturedSection, FeaturedItem } from "../types/featured.ts";

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

            // Batch enrich items by type to avoid N+1 queries
            const enrichedItems = await (async () => {
              if (!items || items.length === 0) return [];

              // Group items by target_type
              const orgItems = items.filter((i: any) => i.target_type === "org");
              const programItems = items.filter(
                (i: any) => i.target_type === "program"
              );
              const coalitionItems = items.filter(
                (i: any) => i.target_type === "coalition"
              );

              // Batch fetch all orgs, programs, and coalitions in parallel
              const [orgsResult, programsResult, coalitionsResult] =
                await Promise.all([
                  orgItems.length > 0
                    ? supabase
                        .from("organizations")
                        .select("id, name, slug, description")
                        .in(
                          "id",
                          orgItems.map((i: any) => i.target_id)
                        )
                    : Promise.resolve({ data: [] }),
                  programItems.length > 0
                    ? supabase
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
                        .in(
                          "id",
                          programItems.map((i: any) => i.target_id)
                        )
                    : Promise.resolve({ data: [] }),
                  coalitionItems.length > 0
                    ? supabase
                        .from("coalitions")
                        .select("id, name, slug, description")
                        .in(
                          "id",
                          coalitionItems.map((i: any) => i.target_id)
                        )
                    : Promise.resolve({ data: [] }),
                ]);

              // Build maps from results
              const orgDataMap = new Map();
              (orgsResult.data || []).forEach((org: any) => {
                orgDataMap.set(org.id, org);
              });

              const programDataMap = new Map();
              (programsResult.data || []).forEach((prog: any) => {
                programDataMap.set(prog.id, prog);
              });

              const coalitionDataMap = new Map();
              (coalitionsResult.data || []).forEach((coal: any) => {
                coalitionDataMap.set(coal.id, coal);
              });

              // Map items back with enriched data
              return items.map((item: any) => {
                try {
                  if (item.target_type === "org") {
                    const orgData = orgDataMap.get(item.target_id);
                    return {
                      ...item,
                      title: item.title || orgData?.name,
                      description: item.description || orgData?.description,
                      org_slug: orgData?.slug,
                    };
                  } else if (item.target_type === "program") {
                    const programData = programDataMap.get(item.target_id);
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

                    // Format spots display
                    let spotsText: string | null = null;
                    if (programData.spots_mode === "unlimited") {
                      spotsText = "Unlimited spots";
                    } else if (
                      programData.spots_mode === "exact" &&
                      programData.spots_count !== null &&
                      programData.spots_count !== undefined
                    ) {
                      spotsText = `${programData.spots_count} spot${
                        programData.spots_count !== 1 ? "s" : ""
                      } available`;
                    }
                    // TBD mode shows nothing (spotsText remains null)

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
                      spotsText,
                    };
                  } else if (item.target_type === "coalition") {
                    const coalitionData = coalitionDataMap.get(item.target_id);
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
                    "Failed to enrich item:",
                    item.id,
                    err
                  );
                  return item;
                }
              });
            })();

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
