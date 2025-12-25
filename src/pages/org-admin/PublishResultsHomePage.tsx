import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import OrgAdminSidebar from "../../components/OrgAdminSidebar";
import AdvertiseFormModal from "../../components/AdvertiseFormModal";
import { orgCreateProgramDraft } from "../../lib/programs";
import { getOrgBySlug } from "../../lib/orgs";

type Program = {
  id: string;
  name: string;
  description: string | null;
  finalized_count: number;
  published_count: number;
};

type CreateState = {
  name: string;
  type: "audition" | "scholarship" | "application" | "competition";
  open_at: string;
  close_at: string;
  is_private: boolean;
  spots_mode: "exact" | "unlimited" | "tbd";
  spots_count: string;
};

export default function PublishResultsHomePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showAdvertiseModal, setShowAdvertiseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateState>({
    name: "",
    type: "audition",
    open_at: "",
    close_at: "",
    is_private: false,
    spots_mode: "exact",
    spots_count: "",
  });

  // Helper to convert datetime-local to ISO or undefined
  const toISOorNull = (v: string) =>
    v ? new Date(v).toISOString() : undefined;

  // Helper to convert database errors to user-friendly messages
  const getUserFriendlyError = (error: any): string => {
    const message = error?.message || "";
    if (
      message.includes("programs_org_name_idx") ||
      message.includes("duplicate key")
    ) {
      return "A program with this name already exists. Please choose a different name.";
    }
    if (
      message.includes("permission denied") ||
      message.includes("insufficient_privilege")
    ) {
      return "You don't have permission to perform this action.";
    }
    return "Something went wrong. Please try again.";
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !orgSlug) return;
    setCreating(true);
    setCreateError(null);

    try {
      if (!form.name.trim()) {
        setCreateError("Program name is required.");
        setCreating(false);
        return;
      }

      if (form.spots_mode === "exact") {
        const spotsNum = parseInt(form.spots_count, 10);
        if (isNaN(spotsNum) || spotsNum < 0) {
          setCreateError(
            "Please enter a valid number of spots (0 or greater)."
          );
          setCreating(false);
          return;
        }
      }

      const newProgram = await orgCreateProgramDraft({
        organization_id: orgId,
        name: form.name,
        type: form.type,
        open_at: toISOorNull(form.open_at),
        close_at: toISOorNull(form.close_at),
        spots_mode: form.spots_mode,
        spots_count:
          form.spots_mode === "exact" ? parseInt(form.spots_count, 10) : null,
      });

      if (form.is_private) {
        await supabase
          .from("programs")
          .update({ is_private: true })
          .eq("id", newProgram.id);
      }

      setForm({
        name: "",
        type: "audition",
        open_at: "",
        close_at: "",
        is_private: false,
        spots_mode: "exact",
        spots_count: "",
      });

      setShowCreateModal(false);
      navigate(`/org/${orgSlug}/admin/programs/${newProgram.id}/builder`);
    } catch (e: any) {
      if (e?.code === "42501" || `${e?.message ?? ""}`.includes("forbidden")) {
        navigate("/unauthorized", { replace: true });
        return;
      }
      setCreateError(getUserFriendlyError(e));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true);
      try {
        // Get organization
        const org = await getOrgBySlug(orgSlug || "");
        if (!org) return;
        setOrgId(org.id);
        setOrgName(org.name);

        // Get programs with finalized and published counts
        // Order by most recently updated first (same as OrgAdminPrograms)
        const { data, error } = await supabase
          .from("programs")
          .select(
            `
            id,
            name,
            description,
            organization_id
          `
          )
          .eq("organization_id", org.id)
          .eq("published", true)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Error loading programs:", error);
          return;
        }

        // Batch fetch counts for all programs in one call (optimization)
        const programIds = (data || []).map((p) => p.id);
        let countsMap = new Map<
          string,
          { finalized_count: number; published_count: number }
        >();

        if (programIds.length > 0) {
          try {
            // Use batch RPC function to get all counts at once
            const { data: countsData, error: countsError } = await supabase.rpc(
              "get_program_counts_batch_v1",
              {
                p_program_ids: programIds,
              }
            );

            if (!countsError && countsData) {
              // Create a map for quick lookup
              countsMap = new Map(
                countsData.map((row: any) => [
                  row.program_id,
                  {
                    finalized_count: Number(row.finalized_count) || 0,
                    published_count: Number(row.published_count) || 0,
                  },
                ])
              );
            }
          } catch (error) {
            console.error("Error fetching batch counts:", error);
            // Fallback: set all counts to 0 if batch fails
          }
        }

        // Map programs with their counts
        const programsWithCounts = (data || []).map((program) => {
          const counts = countsMap.get(program.id) || {
            finalized_count: 0,
            published_count: 0,
          };
          return {
            ...program,
            finalized_count: counts.finalized_count,
            published_count: counts.published_count,
          };
        });

        setPrograms(programsWithCounts);
      } catch (error) {
        console.error("Error loading programs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, [orgSlug]);

  // Filter programs based on search term
  const filteredPrograms = useMemo(() => {
    if (!searchTerm.trim()) return programs;
    const term = searchTerm.toLowerCase();
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [programs, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <OrgAdminSidebar
          currentPath={location.pathname}
          orgId={orgId}
          onCreateNew={() => setShowCreateModal(true)}
          onAdvertise={() => setShowAdvertiseModal(true)}
        />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200">
            <div className="px-8 py-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {orgName ? `${orgName} - Publish Results` : "Publish Results"}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Select a program to publish review results to applicants
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-12">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="text-gray-600 font-medium">
                    Loading programs...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <OrgAdminSidebar
        currentPath={location.pathname}
        orgId={orgId}
        onCreateNew={() => setShowCreateModal(true)}
        onAdvertise={() => setShowAdvertiseModal(true)}
      />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {orgName ? `${orgName} - Publish Results` : "Publish Results"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Select a program to publish review results to applicants
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">
            {/* Search Bar */}
            {programs.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search programs..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {programs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No Published Programs Found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      You need to publish programs before you can publish
                      results.
                    </p>
                    <Link
                      to={`/org/${orgSlug}/admin`}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Create Programs
                    </Link>
                  </div>
                </div>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No Programs Found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      No programs match "{searchTerm}". Try a different search
                      term.
                    </p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map((program) => (
                  <Link
                    key={program.id}
                    to={`/org/${orgSlug}/admin/programs/${program.id}/publish`}
                    className="block p-6 bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 transform hover:scale-105 group"
                  >
                    <div className="h-full flex flex-col">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {program.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {program.description || "No description available"}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                              <span className="text-sm font-medium text-gray-700">
                                Finalized
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {program.finalized_count}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                              <span className="text-sm font-medium text-gray-700">
                                Published
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {program.published_count}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                            <span>Publish Results</span>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create New Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Create New Program
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Set up your program details and jump straight into building
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreate}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g., 2026 Auditions"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={form.type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            type: e.target.value as
                              | "audition"
                              | "scholarship"
                              | "application"
                              | "competition",
                          }))
                        }
                      >
                        <option value="audition">Audition</option>
                        <option value="scholarship">Scholarship</option>
                        <option value="application">Application</option>
                        <option value="competition">Competition</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Opens
                      </label>
                      <input
                        type="datetime-local"
                        step="60"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={form.open_at}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, open_at: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Closes
                      </label>
                      <input
                        type="datetime-local"
                        step="60"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={form.close_at}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, close_at: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Available Spots <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                          <input
                            type="radio"
                            name="spots_mode"
                            className="h-4 w-4 text-indigo-600"
                            checked={form.spots_mode === "exact"}
                            onChange={() =>
                              setForm((f) => ({ ...f, spots_mode: "exact" }))
                            }
                          />
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-800">
                                Exact Number
                              </span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              className={`w-20 rounded-lg border px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                                form.spots_mode === "exact"
                                  ? "border-gray-300 text-gray-900"
                                  : "bg-gray-50 text-gray-400 border-gray-200"
                              }`}
                              value={form.spots_count}
                              onChange={(e) => {
                                e.stopPropagation();
                                setForm((f) => ({
                                  ...f,
                                  spots_count: e.target.value,
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Spots"
                              required={form.spots_mode === "exact"}
                              disabled={form.spots_mode !== "exact"}
                            />
                          </div>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                          <input
                            type="radio"
                            name="spots_mode"
                            className="h-4 w-4 text-indigo-600"
                            checked={form.spots_mode === "unlimited"}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                spots_mode: "unlimited",
                              }))
                            }
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-800">
                              Unlimited
                            </span>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                          <input
                            type="radio"
                            name="spots_mode"
                            className="h-4 w-4 text-indigo-600"
                            checked={form.spots_mode === "tbd"}
                            onChange={() =>
                              setForm((f) => ({ ...f, spots_mode: "tbd" }))
                            }
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-800">
                              To Be Determined
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Privacy
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600"
                        checked={form.is_private}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            is_private: e.target.checked,
                          }))
                        }
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-800">
                          Private Program
                        </span>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Won't appear on homepage or public listings
                        </p>
                      </div>
                    </label>
                  </div>
                  {createError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-red-700 font-medium">
                        {createError}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Creating…
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Create & Open Editor
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <AdvertiseFormModal
        open={showAdvertiseModal}
        onClose={() => setShowAdvertiseModal(false)}
        orgId={orgId}
        orgName={orgName}
        orgSlug={orgSlug || null}
      />
    </div>
  );
}
