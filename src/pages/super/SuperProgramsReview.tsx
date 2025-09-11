// src/pages/super/SuperProgramsReview.tsx
import React, { useEffect, useState } from "react";
import {
  superListProgramSubmissions,
  superReviewProgram,
  superPublishProgram,
  superUnpublishProgram,
  getReviewStatus,
  Program,
  ReviewStatus,
} from "../../lib/programs";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function SuperProgramsReview() {
  const [list, setList] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ReviewStatus>>(
    new Set()
  );
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});

  async function fetchOrgNames() {
    try {
      const { data, error } = await supabase.rpc("super_list_orgs_v1", {
        include_deleted: false,
      });
      if (error) throw error;

      const orgMap: Record<string, string> = {};
      (data || []).forEach((org: any) => {
        orgMap[org.id] = org.name;
      });
      setOrgNames(orgMap);
    } catch (e: any) {
      console.error("Failed to fetch organization names:", e);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      // If no statuses selected, show all. Otherwise, filter by selected statuses
      const statusFilter =
        selectedStatuses.size === 0 ? null : Array.from(selectedStatuses)[0];
      const [data] = await Promise.all([
        superListProgramSubmissions(statusFilter),
        fetchOrgNames(),
      ]);

      // If multiple statuses selected, filter on the client side
      let filteredData = data;
      if (selectedStatuses.size > 1) {
        filteredData = data.filter((program) => {
          const status = getReviewStatus(program);
          return selectedStatuses.has(status);
        });
      }

      setList(filteredData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [selectedStatuses]);

  function handleStatusToggle(status: ReviewStatus) {
    setSelectedStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  }

  async function handleReview(
    p: Program,
    action: "approve" | "request_changes"
  ) {
    setError(null);
    setSuccess(null);
    try {
      const note =
        action === "request_changes"
          ? (
              prompt("Add a note for the org admin (what needs fixing)?") || ""
            ).trim()
          : null;

      await superReviewProgram({ program_id: p.id, action, note });
      setSuccess(action === "approve" ? "Approved" : "Requested changes");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handlePublish(
    p: Program,
    scope: "org" | "coalition",
    coalition_id?: string | null
  ) {
    setError(null);
    setSuccess(null);
    try {
      await superPublishProgram({
        program_id: p.id,
        scope,
        coalition_id: coalition_id ?? null,
      });
      setSuccess(
        scope === "coalition" ? "Published to coalition" : "Published to org"
      );
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleUnpublish(p: Program) {
    setError(null);
    setSuccess(null);
    try {
      await superUnpublishProgram({ program_id: p.id, note: null });
      setSuccess("Unpublished");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Program Reviews
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review programs that have been submitted for approval
              </p>
            </div>
            <Link
              to="/super"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 text-red-800 border border-red-200 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-800 border border-green-200 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Filter */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  value: "submitted" as ReviewStatus,
                  label: "Submitted for Review",
                },
                {
                  value: "changes_requested" as ReviewStatus,
                  label: "Changes Requested",
                },
                { value: "approved" as ReviewStatus, label: "Approved" },
                { value: "unpublished" as ReviewStatus, label: "Unpublished" },
                {
                  value: "draft" as ReviewStatus,
                  label: "Draft (Not Submitted)",
                },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(value)}
                    onChange={() => handleStatusToggle(value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {selectedStatuses.size === 0 && (
              <p className="text-xs text-gray-500 italic">
                No filters selected - showing all programs
              </p>
            )}
          </div>
        </div>

        {/* Programs Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Programs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Org
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Published
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-3 sm:px-6 py-4" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td className="px-3 sm:px-6 py-4" colSpan={6}>
                      No programs found.
                    </td>
                  </tr>
                ) : (
                  list.map((p) => {
                    const st = getReviewStatus(p);
                    return (
                      <tr key={p.id}>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="font-medium text-sm">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm text-gray-700">
                            {orgNames[p.organization_id] ||
                              p.organization_id.substring(0, 8) + "..."}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <span className="text-sm text-gray-700 capitalize">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <span
                            className={
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                              (st === "submitted"
                                ? "bg-blue-100 text-blue-800"
                                : st === "changes_requested"
                                ? "bg-yellow-100 text-yellow-800"
                                : st === "approved"
                                ? "bg-green-100 text-green-800"
                                : st === "unpublished"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800")
                            }
                          >
                            {st.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          {p.published ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                p.published_scope === "coalition"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {p.published_scope === "coalition"
                                ? "Coalition"
                                : "Org"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Not published
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-right">
                          {st === "draft" ? (
                            <div className="text-sm text-gray-500 italic">
                              Waiting for submission
                            </div>
                          ) : st === "changes_requested" ? (
                            <div className="text-sm text-gray-500 italic">
                              Waiting for submission
                            </div>
                          ) : p.published ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-end">
                              {/* Only show Unpublish for published programs */}
                              <button
                                onClick={() => handleUnpublish(p)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded"
                              >
                                Unpublish
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 justify-end">
                              {/* Review Actions for submitted but not published programs */}
                              <button
                                onClick={() =>
                                  handleReview(p, "request_changes")
                                }
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                              >
                                Request Changes
                              </button>

                              {/* Publish Actions (publishing = approving) */}
                              <button
                                onClick={() => handlePublish(p, "org")}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Publish to organization (approves program)"
                              >
                                Publish (Org)
                              </button>
                              <button
                                onClick={() => {
                                  handlePublish(p, "coalition");
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Publish to coalition (approves program)"
                              >
                                Publish (Coalition)
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
