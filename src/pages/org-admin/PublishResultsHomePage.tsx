import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getProgramPublicationCount } from "../../lib/publicationQueries";

type Program = {
  id: string;
  name: string;
  description: string | null;
  finalized_count: number;
  published_count: number;
};

export default function PublishResultsHomePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true);
      try {
        // Get organization ID
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", orgSlug)
          .single();

        if (!org) return;

        // Get programs with finalized and published counts
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
          .is("deleted_at", null);

        if (error) {
          console.error("Error loading programs:", error);
          return;
        }

        // For each program, get finalized and published counts
        const programsWithCounts = await Promise.all(
          (data || []).map(async (program) => {
            // Get finalized reviews count
            const { data: finalizedData } = await supabase.rpc(
              "get_finalized_publish_queue_v1",
              { p_program_id: program.id }
            );
            const finalized_count = (finalizedData as any[])?.length || 0;

            // Get published count using the safe helper
            const published_count = await getProgramPublicationCount(
              supabase,
              program.id
            );

            return {
              ...program,
              finalized_count,
              published_count,
            };
          })
        );

        setPrograms(programsWithCounts);
      } catch (error) {
        console.error("Error loading programs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Publish Results
                </h1>
                <p className="text-sm text-gray-500">
                  Select a program to publish review results to applicants
                </p>
              </div>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Org Admin
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Publish Results
              </h1>
              <p className="text-sm text-gray-500">
                Select a program to publish review results to applicants
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Org Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
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
                  You need to publish programs before you can publish results.
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
                  Create Programs
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
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
  );
}
