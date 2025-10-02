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
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Reviewers
              </h1>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading programs...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Reviewers
              </h1>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Reviewers
              </h1>
              <p className="text-gray-600 mt-2">
                Assign reviewers and admins to your organization's programs
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {programs.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Programs Found
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create programs before you can assign reviewers.
            </p>
            <Link
              to={`/org/${orgSlug}/admin/programs`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Your First Program
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Program Selection */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select a Program
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => setSelectedProgram(program)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedProgram?.id === program.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">
                      {program.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {program.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {program.type}
                      </span>
                      {program.published && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Published
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Assignment Manager */}
            {selectedProgram && (
              <ProgramAssignmentManager
                programId={selectedProgram.id}
                programName={selectedProgram.name}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
