// src/pages/super/SuperProgramsReview.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  superListProgramSubmissions,
  superPublishProgram,
  getReviewStatus,
  Program,
  ReviewStatus,
} from "../../lib/programs";
import { supabase } from "../../lib/supabase";
import { softDeleteProgram, restoreProgram } from "../../services/super";
import ApplicationPreview from "../../components/ApplicationPreview";
import { useAuth } from "../../auth/AuthProvider";
import AutoLinkText from "../../components/AutoLinkText";

export default function SuperProgramsReview() {
  const { user } = useAuth();
  const [list, setList] = useState<Program[]>([]);
  const [deletedList, setDeletedList] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ReviewStatus>>(
    new Set()
  );
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [showDeleted, setShowDeleted] = useState(false);
  const [previewProgram, setPreviewProgram] = useState<Program | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewProgram = (program: Program) => {
    setPreviewProgram(program);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewProgram(null);
  };

  const handleRequestChanges = async (program: Program) => {
    if (!user) return;

    try {
      setLoading(true);
      const note =
        prompt("Add a note for the org admin (what needs fixing)?") || "";

      if (!note.trim()) {
        setError("Please provide a note explaining what needs to be changed.");
        return;
      }

      const meta = program.metadata || {};

      // Unpublish the program and require super admin approval for republishing
      const { error } = await supabase
        .from("programs")
        .update({
          // Unpublish the program immediately
          published: false,
          published_at: null,
          published_scope: null,
          published_by: null,
          published_coalition_id: null,
          metadata: {
            ...meta,
            // Clear pending changes but keep working schema intact
            pending_schema: null,
            review_status: "changes_requested",
            review_note: note.trim(),
            last_changes_requested_at: new Date().toISOString(),
            last_changes_requested_by: user.id,
            // Add flag to require super admin approval for republishing
            requires_super_approval: true,
            last_unpublished_at: new Date().toISOString(),
            last_unpublished_by: user.id,
            // Preserve the working schema in application.schema
            // Don't touch this - it contains the org admin's working changes
          },
        })
        .eq("id", program.id);

      if (error) throw error;

      setSuccess(
        `Change request sent for ${program.name}. Program has been unpublished and requires super admin approval to republish.`
      );
      await refresh(); // Reload data
    } catch (e: any) {
      setError(e.message || "Failed to request changes");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProgram = async (program: Program) => {
    if (!user) return;

    try {
      setLoading(true);

      // Use the existing superPublishProgram RPC function
      await superPublishProgram({
        program_id: program.id,
        scope: program.published_scope === "coalition" ? "coalition" : "org",
        coalition_id: program.published_coalition_id,
      });

      // Clear the super approval requirement and pending changes
      const meta = program.metadata || {};
      await supabase
        .from("programs")
        .update({
          metadata: {
            ...meta,
            // Clear pending changes since they're now approved
            pending_schema: null,
            // Clear the super approval requirement
            requires_super_approval: false,
            // Update approval tracking
            last_approved_at: new Date().toISOString(),
            last_approved_by: user.id,
            // Clear any pending changes status
            review_status: "published",
          },
        })
        .eq("id", program.id);

      setSuccess(`Program ${program.name} has been approved and published.`);
      await refresh(); // Reload data
    } catch (e: any) {
      setError(e.message || "Failed to approve program");
    } finally {
      setLoading(false);
    }
  };

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

  async function fetchDeletedPrograms() {
    if (!showDeleted) {
      setDeletedList([]);
      return;
    }

    try {
      // Get all programs including deleted ones
      const { data, error } = await supabase
        .from("programs")
        .select(
          `
          id,
          organization_id,
          name,
          type,
          description,
          open_at,
          close_at,
          metadata,
          published,
          published_scope,
          published_by,
          published_at,
          published_coalition_id,
          created_at,
          updated_at,
          deleted_at
        `
        )
        .not("deleted_at", "is", null);

      if (error) throw error;
      setDeletedList(data || []);
    } catch (e: any) {
      console.error("Failed to fetch deleted programs:", e);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      console.log("Refreshing super admin data...");
      // If no statuses selected, show all. Otherwise, filter by selected statuses
      const statusFilter =
        selectedStatuses.size === 0 ? null : Array.from(selectedStatuses)[0];
      const [data] = await Promise.all([
        superListProgramSubmissions(statusFilter),
        fetchOrgNames(),
        fetchDeletedPrograms(),
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

  useEffect(() => {
    fetchDeletedPrograms();
  }, [showDeleted]);

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

  async function handleDelete(p: Program) {
    setError(null);
    setSuccess(null);
    try {
      await softDeleteProgram({ p_program_id: p.id });
      setSuccess("Program deleted");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleRestore(p: Program) {
    setError(null);
    setSuccess(null);
    try {
      await restoreProgram({ p_program_id: p.id });
      setSuccess("Program restored");
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
                  value: "pending_changes" as ReviewStatus,
                  label: "Update",
                },
                {
                  value: "changes_requested" as ReviewStatus,
                  label: "Changes Requested",
                },
                { value: "published" as ReviewStatus, label: "Published" },
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

        {/* Deleted Programs Section */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className="flex items-center text-lg font-semibold text-gray-900"
            >
              <svg
                className={`w-5 h-5 mr-2 transform transition-transform ${
                  showDeleted ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Deleted Programs{showDeleted && ` (${deletedList.length})`}
            </button>
          </div>
          {showDeleted && (
            <div className="divide-y divide-gray-200">
              {deletedList.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  No deleted programs found.
                </div>
              ) : (
                deletedList.map((p) => {
                  const st = getReviewStatus(p);
                  const programWithDeleted = p as Program & {
                    deleted_at?: string | null;
                  };
                  return (
                    <div
                      key={p.id}
                      className="px-6 py-4 flex items-center justify-between opacity-60"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 line-through">
                              {p.name}
                            </h3>
                            <p className="text-sm text-gray-500 line-through">
                              <AutoLinkText text={p.description} />
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-400">
                                {orgNames[p.organization_id] || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {p.type}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  st === "submitted"
                                    ? "bg-blue-100 text-blue-800"
                                    : st === "pending_changes"
                                    ? "bg-orange-100 text-orange-800"
                                    : st === "changes_requested"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : st === "published"
                                    ? "bg-green-100 text-green-800"
                                    : st === "unpublished"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {st.replace("_", " ")}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  p.published
                                    ? p.published_scope === "coalition"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {p.published
                                  ? p.published_scope === "coalition"
                                    ? "Coalition"
                                    : "Org"
                                  : "Not published"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          Deleted:{" "}
                          {programWithDeleted.deleted_at
                            ? new Date(
                                programWithDeleted.deleted_at
                              ).toLocaleDateString()
                            : "Unknown"}
                        </span>
                        <button
                          onClick={() => handlePreviewProgram(p)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRestore(p)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Org
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Published
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-center" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-center" colSpan={6}>
                      No programs found.
                    </td>
                  </tr>
                ) : (
                  list.map((p) => {
                    const st = getReviewStatus(p);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => handlePreviewProgram(p)}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {p.name}
                            </button>
                            {p.description && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">
                                <AutoLinkText text={p.description} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="text-sm text-gray-700">
                            {orgNames[p.organization_id] ||
                              p.organization_id.substring(0, 8) + "..."}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-700 capitalize">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                              (st === "submitted"
                                ? "bg-blue-100 text-blue-800"
                                : st === "pending_changes"
                                ? "bg-orange-100 text-orange-800"
                                : st === "changes_requested"
                                ? "bg-yellow-100 text-yellow-800"
                                : st === "published"
                                ? "bg-green-100 text-green-800"
                                : st === "unpublished"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800")
                            }
                          >
                            {(st === "pending_changes" ? "update" : st).replace(
                              "_",
                              " "
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
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
                        <td className="px-4 py-4 text-center">
                          {st === "draft" ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              <div className="text-sm text-gray-500 italic">
                                Waiting for submission
                              </div>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : st === "changes_requested" ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              <div className="text-sm text-gray-500 italic">
                                Waiting for submission
                              </div>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : st === "pending_changes" ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              {/* Super admin can request changes on any program */}
                              <button
                                onClick={() => handleRequestChanges(p)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Request changes from org admin"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : st === "submitted" ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              {/* Submitted programs awaiting super admin approval */}
                              <button
                                onClick={() => handleApproveProgram(p)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Approve and publish program"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRequestChanges(p)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Request changes from org admin"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : p.published ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              {/* Published programs - show request changes and delete */}
                              <button
                                onClick={() => handleRequestChanges(p)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Request changes from org admin"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              {/* Super admin can request changes on any program */}
                              <button
                                onClick={() => handleRequestChanges(p)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded"
                                title="Request changes from org admin"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete program"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
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

      {/* Application Preview Modal */}
      {showPreview && previewProgram && (
        <ApplicationPreview
          program={previewProgram as any}
          isOpen={showPreview}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
