import * as React from "react";
import { supabase } from "@/lib/supabase-browser";
import type { ApplicationSchema } from "@/types/application";
import { useParams, useNavigate } from "react-router-dom";

type ProgramPublic = {
  id: string;
  application_schema: ApplicationSchema | null;
};

export default function ProgramPage() {
  const params = useParams();
  const navigate = useNavigate();
  const programId = typeof params?.id === "string" ? params.id : undefined;

  const [program, setProgram] = React.useState<ProgramPublic | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!programId) return; // <-- guard: prevents id=eq.undefined 400s
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("programs_public")
        .select("id, application_schema")
        .eq("id", programId)
        .maybeSingle();
      if (error) setError(error.message);
      else setProgram((data as any) || null);
      setLoading(false);
    })();
  }, [programId]);

  const startOrContinue = async () => {
    if (!programId) return;
    setStarting(true);
    const { data, error } = await supabase.rpc(
      "app_start_or_get_application_v1",
      {
        p_program_id: programId,
      }
    );
    setStarting(false);
    if (error) {
      setError(error.message);
      return;
    }
    const app = data as { id: string };
    navigate(`/applications/${app.id}`);
  };

  if (!programId) return null;

  return (
    <div className="container">
      <h1>Program</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {program && (
        <>
          <section>
            <h3>Apply</h3>
            <button onClick={startOrContinue} disabled={starting}>
              {starting ? "Starting…" : "Start / Continue Application"}
            </button>
          </section>

          <section>
            <h3>Schema Preview</h3>
            <pre>{JSON.stringify(program.application_schema, null, 2)}</pre>
          </section>
        </>
      )}
    </div>
  );
}
