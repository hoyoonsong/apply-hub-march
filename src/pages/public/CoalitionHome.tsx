import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ProgramCard from "../../components/ProgramCard";
import type { Program } from "../../types/programs";

type Coalition = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export default function CoalitionHome() {
  const { slug } = useParams();
  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      try {
        // First, try to get all coalitions and find the one with matching slug
        const { data: coalitionsData, error: coalitionsErr } =
          await supabase.rpc("super_list_coalitions_v1", {
            include_deleted: false,
          });

        if (coalitionsErr) {
          if (!mounted) return;
          setError("Failed to load coalitions.");
          setLoading(false);
          return;
        }

        if (!mounted) return;

        // Find coalition by slug
        const foundCoalition = coalitionsData?.find(
          (coalition: Coalition) => coalition.slug === slug
        );

        if (!foundCoalition) {
          if (!mounted) return;
          setError("Coalition not found.");
          setLoading(false);
          return;
        }

        setCoalition(foundCoalition);

        // Get programs for this coalition using public RPC
        const { data: pData, error: pErr } = await supabase.rpc(
          "public_list_programs_v1",
          {
            p_type: null,
            p_search: null,
            p_coalition_id: foundCoalition.id,
            p_limit: 100,
            p_offset: 0,
          }
        );

        if (!mounted) return;
        if (pErr) {
          setError("Failed to load programs.");
          setLoading(false);
          return;
        }

        // Filter programs by coalition and published status
        // Also filter out deleted programs (deleted_at should be null)
        const coalitionPrograms = (pData || []).filter(
          (program: Program) =>
            program.published &&
            program.published_scope === "coalition" &&
            program.published_coalition_id === foundCoalition.id &&
            !program.deleted_at
        );

        // Apply search filter
        const filteredPrograms = search
          ? coalitionPrograms.filter(
              (program: Program) =>
                program.name.toLowerCase().includes(search.toLowerCase()) ||
                (program.description &&
                  program.description
                    .toLowerCase()
                    .includes(search.toLowerCase()))
            )
          : coalitionPrograms;

        setPrograms(filteredPrograms);
        setLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "An error occurred.");
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [slug, search]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          <div className="animate-pulse h-8 w-64 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 bg-white rounded-lg shadow-sm border"
              />
            ))}
          </div>
        </div>
      </div>
    );

  if (error || !coalition)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Coalition</h1>
          <p className="mt-3 text-gray-600">{error || "Not found"}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {coalition.name}
              </h1>
              {coalition.slug && (
                <p className="mt-1 text-sm text-gray-500">
                  /coalitions/{coalition.slug}
                </p>
              )}
              {coalition.description && (
                <p className="mt-2 text-gray-600">{coalition.description}</p>
              )}
            </div>
            <Link
              to="/"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Published Programs
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs…"
            className="w-full sm:w-64 h-10 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm px-3"
          />
        </div>

        {programs.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
            No published programs yet for this coalition.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
