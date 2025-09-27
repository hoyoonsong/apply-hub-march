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
            const published_count = await getProgramPublicationCount(supabase, program.id);

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
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Publish Results</h1>
        <p className="text-gray-600">
          Select a program to publish review results to applicants
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <Link
              key={program.id}
              to={`/org/${orgSlug}/admin/programs/${program.id}/publish`}
              className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {program.name}
              </h3>
              {program.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {program.description}
                </p>
              )}
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-500">
                  <div>Finalized: {program.finalized_count}</div>
                  <div>Published: {program.published_count}</div>
                </div>
                <div className="text-blue-600 font-medium">
                  Publish Results →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
