import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getProgramPublicationCount } from "../../lib/publicationQueries";
import { logOnce } from "../../lib/logger";

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
          .eq("published", true);

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
      <div className="max-w-6xl mx-auto p-3 md:p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-4">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Publish Results
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Select a program to publish review results to applicants
          </p>
        </div>
        <Link
          to={`/org/${orgSlug}/admin`}
          className="inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg
            className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Admin Home
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No published programs found.</div>
          <Link
            to={`/org/${orgSlug}/admin/programs`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Create a program first
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {programs.map((program) => (
            <Link
              key={program.id}
              to={`/org/${orgSlug}/admin/programs/${program.id}/publish`}
              className="block h-48 md:h-56 p-4 md:p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div className="h-full flex flex-col">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3 line-clamp-2">
                    {program.name}
                  </h3>
                  <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4 line-clamp-3 min-h-[3rem] md:min-h-[3.75rem]">
                    {program.description || "No description available"}
                  </p>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-center text-xs md:text-sm mb-2 md:mb-3">
                    <div className="text-gray-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-400 rounded-full"></span>
                        <span>Finalized: {program.finalized_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full"></span>
                        <span>Published: {program.published_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
