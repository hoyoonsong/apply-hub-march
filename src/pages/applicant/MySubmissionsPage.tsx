"use client";

import React, { useEffect, useState } from "react";
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
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
      } else {
        setApplicationsRows((data ?? []) as any[]);
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
    <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            My Submissions
          </h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
            View your submitted applications and their results
          </p>
        </div>
        <Link
          to="/dashboard"
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
          Back to Dashboard
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="-mb-px flex space-x-4 md:space-x-8 px-3 md:px-6">
          <button
            onClick={() => setActiveTab("applications")}
            className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors duration-200 ${
              activeTab === "applications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors duration-200 ${
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
        <div className="bg-white rounded-b-lg shadow-sm">
          <div className="p-3 md:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading applications...</p>
              </div>
            ) : applicationsRows.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No applications yet
                </h3>
                <p className="mt-2 text-gray-500">
                  You haven't submitted any applications yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {applicationsRows.map((app) => (
                  <div
                    key={app.id}
                    className="group border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-3 md:space-y-0">
                      <div className="flex-1">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {app.programs.name}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 mt-1">
                          {app.programs.organizations.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Submitted: {new Date(app.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                        <span
                          className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(
                            app.status
                          )}`}
                        >
                          {app.status.charAt(0).toUpperCase() +
                            app.status.slice(1)}
                        </span>
                        <Link
                          to={`/applications/${app.id}`}
                          className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                        >
                          View Application
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <div className="bg-white rounded-b-lg shadow-sm">
          <div className="p-3 md:p-6">
            {resultsRows.length === 0 ? (
              <div className="text-center py-12 md:py-16">
                <div className="mx-auto h-16 w-16 md:h-24 md:w-24 text-gray-300 mb-4 md:mb-6">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-full h-full"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                  No results at this time
                </h3>
                <p className="text-sm md:text-lg text-gray-500 max-w-md mx-auto">
                  Your application results will appear here once they are
                  published by the organization.
                </p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {resultsRows
                  .sort(
                    (a, b) =>
                      new Date(b.published_at).getTime() -
                      new Date(a.published_at).getTime()
                  )
                  .map((r) => {
                    const v = r.visibility;
                    const p = r.payload || {};
                    return (
                      <div
                        key={r.publication_id}
                        className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-start mb-3 md:mb-4">
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-gray-900">
                              {r.program_name}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                              Published:{" "}
                              {new Date(r.published_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {v.decision && p.decision && (
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-purple-700 mb-1">
                                Decision
                              </div>
                              <div className="text-lg font-semibold text-purple-900 capitalize">
                                {p.decision}
                              </div>
                            </div>
                          )}
                          {v.score && p.score !== null && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-blue-800 mb-1">
                                Score
                              </div>
                              <div className="text-lg font-semibold text-blue-900">
                                {p.score}
                              </div>
                            </div>
                          )}
                          {v.comments && p.comments && (
                            <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-800 mb-2">
                                Reviewer Comments:
                              </div>
                              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {p.comments}
                              </div>
                            </div>
                          )}
                        </div>

                        {v.customMessage && (
                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-amber-800 mb-1">
                              Additional Message
                            </div>
                            <div className="text-amber-700">
                              {v.customMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
