import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { startOrGetApplication } from "../../lib/rpc";
import { loadApplicationSchemaById } from "../../lib/schemaLoader";
import { supabase } from "../../lib/supabase";
import AutoLinkText from "../../components/AutoLinkText";

type ProgramPublic = {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  published?: boolean;
  published_scope?: string;
  published_at?: string;
  open_at?: string;
  close_at?: string;
  application_schema?: any;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function formatDate(s?: string | null) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toLocaleString();
}

export default function ProgramDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const programId = useMemo(() => (params?.id as string) || "", [params]);
  const [program, setProgram] = useState<ProgramPublic | null>(null);
  const [_loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!programId) return; // <-- guard: prevents id=eq.undefined 400s
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Parallelize program details and schema loading
        const [programResult, schemaResult] = await Promise.allSettled([
          supabase
            .from("programs_public")
            .select("id, name, type, description, open_at, close_at, published")
            .eq("id", programId)
            .single(),
          loadApplicationSchemaById(programId),
        ]);

        if (
          programResult.status === "rejected" ||
          programResult.value.error ||
          !programResult.value.data
        ) {
          // If program not found, redirect to unauthorized
          navigate("/unauthorized");
          return;
        }

        const programData = programResult.value.data;

        // Check if program is published
        if (!programData.published) {
          navigate("/unauthorized");
          return;
        }
        setProgram(programData);

        if (schemaResult.status === "fulfilled") {
          console.log("🔍 ProgramDetail - Loaded schema:", schemaResult.value);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [programId, navigate]);

  const handleStart = async () => {
    if (!programId) return;
    setStarting(true);
    try {
      // Keep URL stable; server will create/load application row internally
      navigate(`/programs/${programId}/apply`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  if (!programId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {program?.name || "Loading..."}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Type: {program?.type || "Loading..."}
              </p>
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

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <div className="mt-3 text-gray-700">
                <AutoLinkText
                  text={program?.description || "No description provided."}
                  preserveWhitespace={true}
                />
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <Row
                  label="Published"
                  value={program?.published ? "Yes" : "No"}
                />
                <Row
                  label="Published Scope"
                  value={program?.published_scope || undefined}
                />
                <Row
                  label="Published At"
                  value={formatDate(program?.published_at)}
                />
                <Row label="Opens" value={formatDate(program?.open_at)} />
                <Row label="Closes" value={formatDate(program?.close_at)} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Apply</h2>
              <p className="mt-2 text-sm text-gray-600">
                Click below to start or continue your application.
              </p>
              <button
                onClick={handleStart}
                disabled={starting}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {starting ? "Starting..." : "Start / Continue Application"}
              </button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {/* Application Schema Info */}
            {program?.application_schema && (
              <div className="bg-white border rounded-lg p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Application Details
                </h2>

                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 mb-2">
                    Common Application Options
                  </h3>
                  <ul className="list-disc ml-6 text-sm text-gray-600">
                    <li>
                      Omnipply Common App:{" "}
                      {program.application_schema.common?.applyhub
                        ? "Yes"
                        : "No"}
                    </li>
                    <li>
                      Coalition Common App:{" "}
                      {program.application_schema.common?.coalition
                        ? "Yes"
                        : "No"}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">
                    Custom Questions
                  </h3>
                  {program.application_schema.builder?.length ? (
                    <ul className="list-disc ml-6 text-sm text-gray-600">
                      {program.application_schema.builder.map(
                        (item: any, i: number) => (
                          <li key={i}>
                            <code className="bg-gray-100 px-1 rounded text-xs">
                              {item.type}
                            </code>{" "}
                            — <AutoLinkText text={item.label} />
                            {item.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No custom questions yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
