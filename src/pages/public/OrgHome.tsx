import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getOrgBySlug, type Org } from "../../lib/orgs";
import ProgramCard from "../../components/ProgramCard";
import type { Program } from "../../types/programs";
import AutoLinkText from "../../components/AutoLinkText";
import { isPastDeadline } from "../../lib/deadlineUtils";

export default function OrgHome() {
  const { orgSlug } = useParams();
  const [org, setOrg] = useState<Org | null>(null);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load organization and programs data (only once)
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!orgSlug) return;
      setLoading(true);
      setError(null);

      try {
        // Get organization by slug using public table access
        const foundOrg = await getOrgBySlug(orgSlug);

        if (!foundOrg) {
          if (!mounted) return;
          setError("Organization not found.");
          setLoading(false);
          return;
        }

        setOrg(foundOrg);

        // Get programs for this organization using public RPC
        const { data: pData, error: pErr } = await supabase.rpc(
          "public_list_programs_v1",
          {
            p_type: null,
            p_search: null,
            p_coalition_id: null,
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

        // Filter programs by organization and published status
        // Also filter out deleted programs (deleted_at should be null)
        // And filter out private programs (only show public programs)
        // Filter out programs where deadline has passed (remove completely)
        // Keep programs that haven't opened yet (they'll be greyed out by ProgramCard)
        // Check both column and metadata (column takes precedence)
        const orgPrograms = (pData || []).filter((program: Program) => {
          if (
            program.organization_id !== foundOrg.id ||
            !program.published ||
            program.deleted_at
          ) {
            return false;
          }
          
          // Remove programs where deadline has passed
          if (isPastDeadline(program.close_at)) {
            return false;
          }
          
          const columnValue = (program as any).is_private;
          // If column is explicitly false, it's public
          if (columnValue === false) return true;
          // If column is explicitly true, it's private
          if (columnValue === true) return false;
          // If column is null/undefined, check metadata as fallback
          if (columnValue === null || columnValue === undefined) {
            return !(program.metadata as any)?.is_private;
          }
          // Default to public if we can't determine
          return true;
        });

        setAllPrograms(orgPrograms);
        setFilteredPrograms(orgPrograms);
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
  }, [orgSlug]);

  // Filter programs based on search term (separate effect)
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPrograms(allPrograms);
    } else {
      const filtered = allPrograms.filter(
        (program: Program) =>
          program.name.toLowerCase().includes(search.toLowerCase()) ||
          (program.description &&
            program.description.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredPrograms(filtered);
    }
  }, [search, allPrograms]);

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

  if (error || !org)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Organization</h1>
          <p className="mt-3 text-gray-600">{error || "Not found"}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Go to Dashboard
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
                {org.name}
              </h1>
              {org.slug && (
                <p className="mt-1 text-sm text-gray-500">/org/{org.slug}</p>
              )}
              {org.description && (
                <p className="mt-2 text-gray-600">
                  <AutoLinkText text={org.description} />
                </p>
              )}
            </div>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Dashboard
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

        {filteredPrograms.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
            {search
              ? "No programs match your search."
              : "No published programs yet for this organization."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
