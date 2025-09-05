import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Program } from "../../types/programs";

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
  const { id } = useParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // Get all programs and find the one with matching ID
        const { data, error } = await supabase.rpc("super_list_programs_v1");

        if (!mounted) return;
        if (error) {
          setError("Failed to load programs.");
          setLoading(false);
          return;
        }

        // Find program by ID and ensure it's published
        const foundProgram = (data || []).find(
          (program: Program) => program.id === id && program.published
        );

        if (!foundProgram) {
          if (!mounted) return;
          setError("Program not found or not published.");
          setLoading(false);
          return;
        }

        setProgram(foundProgram);
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
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-24 w-full bg-white border rounded animate-pulse" />
        </div>
      </div>
    );

  if (error || !program)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Program</h1>
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
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {program.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Type: {program.type}</p>
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
              <p className="mt-3 text-gray-700 whitespace-pre-line">
                {program.description || "No description provided."}
              </p>
            </div>

            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <Row
                  label="Published"
                  value={program.published ? "Yes" : "No"}
                />
                <Row
                  label="Published Scope"
                  value={program.published_scope || undefined}
                />
                <Row
                  label="Published At"
                  value={formatDate(program.published_at)}
                />
                <Row label="Opens" value={formatDate(program.open_at)} />
                <Row label="Closes" value={formatDate(program.close_at)} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Apply</h2>
              <p className="mt-2 text-sm text-gray-600">
                The application form will appear here once built. For now, this
                is a placeholder CTA.
              </p>
              <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                Start Application
              </button>
            </div>

            {program.metadata?.review && (
              <div className="bg-white border rounded-lg p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900">Review</h2>
                <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-x-auto">
                  {JSON.stringify(program.metadata.review, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
