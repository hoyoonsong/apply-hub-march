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

export default function SuperProgramsReview() {
  const [list, setList] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "">("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await superListProgramSubmissions(filter || null);
      setList(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [filter]);

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
                Approve, request changes, publish or unpublish
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              className="w-full sm:w-48 h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="unpublished">Unpublished</option>
              <option value="draft" disabled>
                Draft (admin-only)
              </option>
            </select>
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
                          <div className="text-xs text-gray-500 font-mono">
                            {p.organization_id.substring(0, 8)}...
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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            {/* Review Actions */}
                            <button
                              onClick={() => handleReview(p, "approve")}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(p, "request_changes")}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                            >
                              Request Changes
                            </button>

                            {/* Publish / Unpublish Actions */}
                            {p.published ? (
                              <button
                                onClick={() => handleUnpublish(p)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded"
                              >
                                Unpublish
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handlePublish(p, "org")}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded"
                                  title="Publish to organization"
                                >
                                  Publish (Org)
                                </button>
                                <button
                                  onClick={() => {
                                    handlePublish(p, "coalition");
                                  }}
                                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-1.5 rounded"
                                  title="Publish to coalition"
                                >
                                  Publish (Coalition)
                                </button>
                              </>
                            )}
                          </div>
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
