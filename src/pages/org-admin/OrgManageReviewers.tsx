import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ProgramAssignmentManager from "../../components/ProgramAssignmentManager";

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string;
  published: boolean;
}

export default function OrgManageReviewers() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  useEffect(() => {
    loadPrograms();
  }, [orgSlug]);

  async function loadPrograms() {
    if (!orgSlug) return;

    try {
      setLoading(true);
      setError(null);

      // Get organization ID first
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (orgError || !orgData) {
        throw new Error("Organization not found");
      }

      // Get programs for this organization
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, description, type, published")
        .eq("organization_id", orgData.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Manage Reviewers
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Assign reviewers and admins to your organization's programs
                </p>
              </div>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Org Admin
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Manage Reviewers
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Assign reviewers and admins to your organization's programs
                </p>
              </div>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Org Admin
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 px-6 py-4 bg-red-50 border border-red-200 rounded-lg">
            <svg
              className="w-5 h-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Manage Reviewers
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Assign reviewers and admins to your organization's programs
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Org Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Programs Found
                </h3>
                <p className="text-gray-600 mb-6">
                  You need to create programs before you can assign reviewers.
                </p>
                <Link
                  to={`/org/${orgSlug}/admin/programs`}
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
                  Create Your First Program
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Program Selection */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Select a Program
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a program to manage reviewer assignments
                  </p>
                </div>
              </div>
              <div className="space-y-8">
                {/* Render programs in rows of 3 */}
                {Array.from(
                  { length: Math.ceil(programs.length / 3) },
                  (_, rowIndex) => {
                    const startIndex = rowIndex * 3;
                    const rowPrograms = programs.slice(
                      startIndex,
                      startIndex + 3
                    );
                    const hasSelectedInRow = rowPrograms.some(
                      (p) => selectedProgram?.id === p.id
                    );

                    return (
                      <div key={rowIndex} className="space-y-6">
                        {/* Program Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {rowPrograms.map((program) => (
                            <button
                              key={program.id}
                              onClick={() => setSelectedProgram(program)}
                              className={`p-6 border-2 rounded-xl text-left transition-all duration-200 transform hover:scale-105 ${
                                selectedProgram?.id === program.id
                                  ? "border-indigo-500 bg-white shadow-lg shadow-indigo-100/50"
                                  : "border-gray-200 hover:border-indigo-300 hover:bg-white shadow-sm hover:shadow-lg"
                              }`}
                            >
                              <h3 className="font-bold text-gray-900 text-lg mb-2">
                                {program.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {program.description || "No description"}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                  {program.type}
                                </span>
                                {program.published && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                    Published
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Management Section - appears right under this row if a program is selected */}
                        {hasSelectedInRow && selectedProgram && (
                          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
                                <h2 className="text-xl font-bold text-gray-900">
                                  Manage Reviewers for {selectedProgram.name}
                                </h2>
                              </div>
                            </div>
                            <div className="p-8">
                              <ProgramAssignmentManager
                                programId={selectedProgram.id}
                                programName={selectedProgram.name}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
