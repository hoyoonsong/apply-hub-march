import type { SupabaseClient } from "@supabase/supabase-js";

const FK_FORWARD = "application_publications_application_id_fkey";
const FK_REVERSE = "applications_results_current_publication_id_fkey";

export async function hasProgramPublications(
  client: SupabaseClient,
  programId: string
) {
  // 1) Fast path: the view (no ambiguity, respects RLS)
  let r = await client
    .from("program_publications")
    .select("publication_id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (!r.error) return (r.count ?? 0) > 0;

  // 2) Fallback A: explicit forward FK embed
  r = (await client
    .from("application_publications")
    .select(`id, applications!${FK_FORWARD}!inner(program_id)`, {
      head: true,
      count: "exact",
    })
    .eq("applications.program_id", programId)
    .limit(1)) as any;

  if (!r.error) return (r.count ?? 0) > 0;

  // 3) Fallback B: rare case, try reverse path (usually not what we want)
  r = (await client
    .from("application_publications")
    .select(`id, applications!${FK_REVERSE}!inner(program_id)`, {
      head: true,
      count: "exact",
    })
    .eq("applications.program_id", programId)
    .limit(1)) as any;

  return !r.error && (r.count ?? 0) > 0;
}

export async function listProgramPublications(
  client: SupabaseClient,
  programId: string,
  limit = 50
) {
  // Prefer the view for clarity; same fallback strategy
  const viaView = await client
    .from("program_publications")
    .select("publication_id, application_id, published_at, unpublished_at")
    .eq("program_id", programId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!viaView.error) return viaView;

  const viaEmbed = await client
    .from("application_publications")
    .select(
      `id:publication_id, application_id, published_at, unpublished_at, applications!${FK_FORWARD}!inner(program_id)`
    )
    .eq("applications.program_id", programId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return viaEmbed;
}

export async function getProgramPublicationCount(
  client: SupabaseClient,
  programId: string
): Promise<number> {
  // 1) Fast path: the view (no ambiguity, respects RLS)
  let r = await client
    .from("program_publications")
    .select("publication_id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (!r.error) return r.count ?? 0;

  // 2) Fallback A: explicit forward FK embed
  r = (await client
    .from("application_publications")
    .select(`id, applications!${FK_FORWARD}!inner(program_id)`, {
      head: true,
      count: "exact",
    })
    .eq("applications.program_id", programId)) as any;

  if (!r.error) return r.count ?? 0;

  // 3) Fallback B: rare case, try reverse path (usually not what we want)
  r = (await client
    .from("application_publications")
    .select(`id, applications!${FK_REVERSE}!inner(program_id)`, {
      head: true,
      count: "exact",
    })
    .eq("applications.program_id", programId)) as any;

  return !r.error ? r.count ?? 0 : 0;
}
