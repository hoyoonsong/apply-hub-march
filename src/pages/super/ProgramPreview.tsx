import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { loadApplicationSchemaById } from "../../lib/schemaLoader";
import ApplicationPreview from "../../components/ApplicationPreview";

type Program = {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  organization_id: string;
  published: boolean;
  published_scope: string | null;
  published_coalition_id: string | null;
};

type Org = { id: string; slug: string; name: string };

export default function ProgramPreview() {
  const { programId } = useParams<{ programId: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgram();
  }, [programId]);

  async function loadProgram() {
    if (!programId) return;

    try {
      setLoading(true);
      setError(null);

      // Load program details - use programs_public table for super admin
      const { data: programData, error: programError } = await supabase
        .from("programs_public")
        .select("*")
        .eq("id", programId)
        .single();

      if (programError) throw programError;
      setProgram(programData);

      // Load organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .eq("id", programData.organization_id)
        .single();

      if (orgError) throw orgError;
      setOrg(orgData);

      // Load application schema using centralized loader
      try {
        const schema = await loadApplicationSchemaById(programId);
        setFields(schema.fields);
      } catch (e) {
        console.error("Failed to load schema:", e);
        setFields([]);
      }
    } catch (err: any) {
      console.error("Failed to load program:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading program...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              {error || "Program not found"}
            </div>
            <Link
              to="/super/programs"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Programs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {program.name}
              </h1>
              {program.description && (
                <p className="mt-1 text-gray-600">{program.description}</p>
              )}
              {org && (
                <p className="mt-1 text-sm text-gray-500">
                  Organization: {org.name}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                to="/super/programs"
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ← Back to Programs
              </Link>
              <Link
                to={`/super/programs/${programId}/builder`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Edit Application
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Application Preview
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              This is how the application form will appear to applicants.
            </p>

            <ApplicationPreview
              fields={fields}
              isOpen={true}
              onClose={() => {}}
              alwaysOpen={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
