"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

type ResultsRow = {
  application_id: string;
  program_id: string;
  program_name: string;
  publication_id: string;
  published_at: string;
  visibility: {
    decision: boolean;
    score: boolean;
    comments: boolean;
    customMessage?: string | null;
  };
  payload: {
    decision?: string | null;
    score?: number | null;
    comments?: string | null;
  };
};

type ApplicationRow = {
  id: string;
  program_id: string;
  user_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  created_at: string;
  updated_at: string;
  programs: {
    name: string;
    organization_id: string;
    organizations: {
      name: string;
    };
  };
};

export default function MySubmissionsPage() {
  const [activeTab, setActiveTab] = useState<"applications" | "results">(
    "applications"
  );
  const [resultsRows, setResultsRows] = useState<ResultsRow[]>([]);
  const [applicationsRows, setApplicationsRows] = useState<ApplicationRow[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refreshResults = async () => {
    const { data, error } = await supabase.rpc("get_published_results_v1");
    if (!error) setResultsRows((data ?? []) as ResultsRow[]);
  };

  const refreshApplications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          program_id,
          user_id,
          status,
          created_at,
          updated_at,
          programs!inner(name, organization_id, organizations(name))
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
      } else {
        setApplicationsRows((data ?? []) as ApplicationRow[]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshResults();
    refreshApplications();

    const channel = supabase
      .channel("notif")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "type=eq.results_published",
        },
        () => refreshResults()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "waitlisted":
        return "bg-orange-100 text-orange-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">My Submissions</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("applications")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "applications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "results"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Results
          </button>
        </nav>
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : applicationsRows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No applications submitted yet.
            </div>
          ) : (
            applicationsRows.map((app) => (
              <div key={app.id} className="rounded-2xl p-4 border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{app.programs.name}</div>
                    <div className="text-sm text-gray-500">
                      {app.programs.organizations.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Submitted: {new Date(app.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    <Link
                      to={`/applications/${app.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Application
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <div className="space-y-4">
          {resultsRows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No results yet.
            </div>
          ) : (
            resultsRows.map((r) => {
              const v = r.visibility;
              const p = r.payload || {};
              return (
                <div key={r.publication_id} className="rounded-2xl p-4 border">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{r.program_name}</div>
                      <div className="text-xs text-gray-500">
                        Published: {new Date(r.published_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid sm:grid-cols-3 gap-3">
                    {v.decision && p.decision && (
                      <div>
                        <div className="text-xs text-gray-500">Decision</div>
                        <div className="font-semibold">{p.decision}</div>
                      </div>
                    )}
                    {v.score && p.score !== null && (
                      <div>
                        <div className="text-xs text-gray-500">Score</div>
                        <div className="font-semibold">{p.score}</div>
                      </div>
                    )}
                    {v.comments && p.comments && (
                      <div className="sm:col-span-3">
                        <div className="text-xs text-gray-500">Comments</div>
                        <div className="whitespace-pre-wrap">{p.comments}</div>
                      </div>
                    )}
                    {v.customMessage ? (
                      <div className="sm:col-span-3 rounded bg-gray-50 p-3 text-sm">
                        {v.customMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
