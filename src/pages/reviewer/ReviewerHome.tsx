import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useScope } from "../../auth/ScopeProvider";

type Org = { id: string; name: string; slug: string };
type Prog = {
  program_id: string;
  program_name: string;
  organization_id: string;
  organization_name: string;
};

export default function ReviewerHome() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [programs, setPrograms] = useState<Prog[]>([]);
  const [loading, setLoading] = useState(true);
  const { setScope } = useScope();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, p] = await Promise.all([
        supabase.rpc("my_reviewer_orgs_v1"),
        supabase.rpc("my_reviewer_programs_v1"),
      ]);
      if (!o.error) setOrgs(o.data ?? []);
      if (!p.error) setPrograms(p.data ?? []);
      setLoading(false);
    })();
  }, []);

  const onPickOrg = (o: Org) => {
    setScope({ kind: "org", id: o.id, slug: o.slug, name: o.name });
    navigate(`/org/${o.slug}/reviewer`);
  };

  const onOpenProgram = (pr: Prog) => {
    // Set org scope so downstream pages can filter
    setScope({
      kind: "org",
      id: pr.organization_id,
      slug: "",
      name: pr.organization_name,
    });
    navigate(`/program/${pr.program_id}/review`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Reviewer
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Select an organization or program to review.
              </p>
            </div>
            <Link
              to="/hub"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {loading ? (
          <div className="mt-8 text-gray-500">Loading…</div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900">
              Organizations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onPickOrg(o)}
                  className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-all hover:border-gray-300"
                >
                  <div className="text-lg font-semibold text-gray-900">
                    {o.name}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">/{o.slug}</div>
                </button>
              ))}
              {orgs.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-4">
                  No org assignments.
                </div>
              )}
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mt-10">
              Programs (direct)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {programs.map((pr) => (
                <button
                  key={pr.program_id}
                  onClick={() => onOpenProgram(pr)}
                  className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-all hover:border-gray-300"
                >
                  <div className="text-lg font-semibold text-gray-900">
                    {pr.program_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pr.organization_name}
                  </div>
                </button>
              ))}
              {programs.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-4">
                  No program assignments.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
