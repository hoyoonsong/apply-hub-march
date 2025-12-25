import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import {
  isBeforeOpenDate,
  isApplicationOpen,
  getOpenDateMessage,
} from "../../lib/deadlineUtils";

type ProgramPublic = {
  id: string;
  name: string;
  description: string | null;
  type: "audition" | "scholarship" | "application" | "competition";
  open_at: string | null;
  close_at: string | null;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  published_scope: "org" | "coalition" | null;
  published_coalition_id: string | null;
  metadata: any;
  spots_mode?: "exact" | "unlimited" | "tbd" | null;
  spots_count?: number | null;
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
        navigate("/unauthorized"); // not found
        return;
      }

      // Check if program is published
      if (!data.published) {
        navigate("/unauthorized"); // not published
        return;
      }
      setProgram(data as ProgramPublic);
      setLoading(false);
    })();
  }, [user, authLoading, programId, navigate]);

  const handleStart = async () => {
    if (!programId) return;
    setStarting(true);
    try {
      // Stable URL; DirectApplication will create/load the application row
      navigate(`/programs/${programId}/apply`);
    } finally {
      setStarting(false);
    }
  };

  if (authLoading || loading || !program) return null;

  const builder = program.metadata?.builder ?? [];
  const includeHubCommon = !!program.metadata?.include_hub_common;
  const includeCoalitionCommon = !!program.metadata?.include_coalition_common;
  const includeProfile = !!(
    program.metadata?.application?.profile?.enabled ||
    program.metadata?.form?.include_profile
  );

  // Check if application opens soon
  const isOpensSoon = isBeforeOpenDate(program.open_at);
  const isOpen = isApplicationOpen(program.open_at, program.close_at);

  // Format spots display
  const getSpotsText = (): string | null => {
    if (!program.spots_mode) return null;
    
    if (program.spots_mode === "unlimited") {
      return "Unlimited spots available";
    }
    
    if (program.spots_mode === "tbd") {
      return null; // Don't show anything for TBD
    }
    
    if (program.spots_mode === "exact" && program.spots_count !== null && program.spots_count !== undefined) {
      return `${program.spots_count} spot${program.spots_count !== 1 ? 's' : ''} available`;
    }
    
    return null;
  };

  const spotsText = getSpotsText();

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

      {/* Opens Soon Banner */}
      {isOpensSoon && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <div>
              <div className="font-semibold text-gray-900">
                Application Coming Soon
              </div>
              <div className="text-sm text-gray-600">
                {getOpenDateMessage(program.open_at)}
              </div>
              <div className="text-sm text-yellow-600 mt-1">
                Application will be available soon
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spots Information */}
      {spotsText && !isOpensSoon && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div className="font-semibold text-blue-900">{spotsText}</div>
          </div>
        </div>
      )}

      {/* Only show application details if not opening soon */}
      {!isOpensSoon && (
        <>
          <div className="rounded border bg-white p-4">
            <div className="font-medium mb-2">Common Application Options</div>
            <ul className="list-disc ml-5 text-sm">
              <li>Omnipply Common App: {includeHubCommon ? "Yes" : "No"}</li>
              <li>
                Coalition Common App: {includeCoalitionCommon ? "Yes" : "No"}
              </li>
              <li>
                Profile Autofill: {includeProfile ? "Yes" : "No"}
                {includeProfile && (
                  <span className="text-blue-600 text-xs ml-2">
                    (Your profile will be automatically included)
                  </span>
                )}
              </li>
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
              disabled={starting || !isOpen}
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
        </>
      )}
    </div>
  );
}
