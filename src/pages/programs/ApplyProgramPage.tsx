import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

type ProgramPublic = {
  id: string;
  name: string;
  description: string | null;
  type: "audition" | "scholarship";
  open_at: string | null;
  close_at: string | null;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  published_scope: "org" | "coalition" | null;
  published_coalition_id: string | null;
  metadata: any;
};

export default function ApplyProgramPage() {
  const { programId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<ProgramPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      // must be logged in to apply
      if (!authLoading && !user) {
        navigate(`/?next=/programs/${programId}/apply`);
        return;
      }
      if (authLoading) return;
      // load published program from the view
      const { data, error } = await supabase
        .from("programs_public")
        .select("*")
        .eq("id", programId)
        .single();

      if (error || !data) {
        navigate("/"); // not published or invalid id
        return;
      }
      setProgram(data as ProgramPublic);
      setLoading(false);
    })();
  }, [user, authLoading, programId, navigate]);

  const handleStart = async () => {
    if (!programId) return;
    setStarting(true);
    const { data, error } = await supabase.rpc(
      "app_start_or_get_application_v1",
      {
        p_program_id: programId,
      }
    );
    setStarting(false);
    if (error || !data) {
      console.error("Failed to start application:", error);
      alert("Could not start application. Please try again.");
      return;
    }
    // data is the application row created/found
    navigate(`/applications/${data.id}`);
  };

  if (authLoading || loading || !program) return null;

  const builder = program.metadata?.builder ?? [];
  const includeHubCommon = !!program.metadata?.include_hub_common;
  const includeCoalitionCommon = !!program.metadata?.include_coalition_common;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{program.name}</h1>
        <button
          onClick={() => navigate(`/programs/${program.id}`)}
          className="btn btn-secondary"
        >
          View Overview
        </button>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">Common Application Options</div>
        <ul className="list-disc ml-5 text-sm">
          <li>Apply-Hub Common App: {includeHubCommon ? "Yes" : "No"}</li>
          <li>Coalition Common App: {includeCoalitionCommon ? "Yes" : "No"}</li>
        </ul>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-3">Application Builder</div>
        {builder.length === 0 ? (
          <div className="text-sm text-slate-500">
            This program hasn't added custom questions yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {builder.map((f: any, i: number) => (
              <li
                key={i}
                className="flex items-center justify-between rounded border p-2"
              >
                <div className="text-sm">
                  <span className="font-mono text-xs mr-2">{f.kind}</span>
                  {f.label || f.placeholder || f.name || "Question"}
                </div>
                {f.required && (
                  <span className="text-xs text-rose-600">required</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          className="btn btn-primary"
          disabled={starting}
        >
          {starting ? "Starting..." : "Start / Continue Application"}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline"
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
