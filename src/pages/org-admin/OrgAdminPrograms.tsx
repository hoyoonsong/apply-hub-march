// src/pages/org-admin/OrgAdminPrograms.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getOrgBySlug } from "../../lib/orgs";
import {
  listOrgPrograms,
  orgCreateProgramDraft,
  ProgramRow,
  getProgramRowReviewStatus,
  getReviewStatus,
  Program,
} from "../../lib/programs";

type ProgramWithDeleted = Program & {
  deleted_at?: string | null;
};
import { supabase } from "../../lib/supabase";
import {
  adminListPrograms,
  adminSoftDeleteProgram,
  adminRestoreProgram,
} from "../../services/admin";

type CreateState = {
  name: string;
  type: "audition" | "scholarship";
  description: string;
  open_at: string; // datetime-local value
  close_at: string; // datetime-local value
};

export default function OrgAdminPrograms() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramWithDeleted[]>([]);
  const [deletedList, setDeletedList] = useState<ProgramWithDeleted[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<CreateState>({
    name: "",
    type: "audition",
    description: "",
    open_at: "",
    close_at: "",
  });

  // Small helper: convert datetime-local to ISO or undefined
  const toISOorNull = (v: string) =>
    v ? new Date(v).toISOString() : undefined;

  // Gate: ensure user is allowed (reuse existing /unauthorized route if checks fail)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!orgSlug) throw new Error("Missing org slug");
        // 1) resolve org
        const org = await getOrgBySlug(orgSlug);
        if (!org) {
          navigate("/unauthorized", { replace: true });
          return;
        }

        // 2) optional: light auth check — list RPC will 42501 if not allowed.
        // If you want a precheck, you can reuse my_admin_orgs_v1 and match slug.
        // Here we rely on RPC error to redirect.

        if (!mounted) return;
        setOrgId(org.id);
        setOrgName(org.name);

        // 3) list programs
        const rows = await adminListPrograms(org.id, true); // Always get all programs including deleted
        if (!mounted) return;

        // Separate active and deleted programs
        const activePrograms = rows.filter(
          (p: ProgramWithDeleted) => !p.deleted_at
        );
        const deletedPrograms = rows.filter(
          (p: ProgramWithDeleted) => p.deleted_at
        );

        setPrograms(activePrograms as ProgramWithDeleted[]);
        setDeletedList(deletedPrograms as ProgramWithDeleted[]);
        setListError(null);
      } catch (e: any) {
        // If forbidden from listing, bounce to unauthorized
        if (
          e?.code === "42501" ||
          `${e?.message ?? ""}`.includes("forbidden")
        ) {
          navigate("/unauthorized", { replace: true });
          return;
        }
        setListError(e?.message ?? "Failed to load programs");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orgSlug, navigate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setCreating(true);
    setCreateError(null);
    setSuccessMsg(null);

    try {
      if (!form.name.trim()) {
        setCreateError("Program name is required.");
        setCreating(false);
        return;
      }

      await orgCreateProgramDraft({
        organization_id: orgId,
        name: form.name,
        type: form.type,
        description: form.description || undefined,
        open_at: toISOorNull(form.open_at),
        close_at: toISOorNull(form.close_at),
      });

      setSuccessMsg("Draft program created.");
      setForm({
        name: "",
        type: "audition",
        description: "",
        open_at: "",
        close_at: "",
      });

      // refresh list
      const rows = await listOrgPrograms(orgId);
      // Convert ProgramRow to ProgramWithDeleted
      const convertedRows = rows.map((row) => ({
        ...row,
        organization_id: orgId,
        published_by: null,
        published_coalition_id: null,
      })) as ProgramWithDeleted[];
      setPrograms(convertedRows);
    } catch (e: any) {
      // If forbidden from creating, bounce to unauthorized
      if (e?.code === "42501" || `${e?.message ?? ""}`.includes("forbidden")) {
        navigate("/unauthorized", { replace: true });
        return;
      }
      setCreateError(e?.message ?? "Failed to create program");
    } finally {
      setCreating(false);
    }
  }

  const onDelete = async (id: string) => {
    try {
      await adminSoftDeleteProgram(id);
      setSuccess("Program deleted");
      // Refresh the list
      if (orgId) {
        const rows = await adminListPrograms(orgId, true);
        const activePrograms = rows.filter(
          (p: ProgramWithDeleted) => !p.deleted_at
        );
        const deletedPrograms = rows.filter(
          (p: ProgramWithDeleted) => p.deleted_at
        );
        setPrograms(activePrograms as ProgramWithDeleted[]);
        setDeletedList(deletedPrograms as ProgramWithDeleted[]);
      }
    } catch (e: any) {
      setListError(e?.message ?? "Delete failed");
    }
  };

  const onRestore = async (id: string) => {
    try {
      await adminRestoreProgram(id);
      setSuccess("Program restored");
      // Refresh the list
      if (orgId) {
        const rows = await adminListPrograms(orgId, true);
        const activePrograms = rows.filter(
          (p: ProgramWithDeleted) => !p.deleted_at
        );
        const deletedPrograms = rows.filter(
          (p: ProgramWithDeleted) => p.deleted_at
        );
        setPrograms(activePrograms as ProgramWithDeleted[]);
        setDeletedList(deletedPrograms as ProgramWithDeleted[]);
      }
    } catch (e: any) {
      setListError(e?.message ?? "Restore failed");
    }
  };

  const hasPrograms = useMemo(() => (programs?.length ?? 0) > 0, [programs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {orgName} — Programs
              </h1>
              <p className="text-sm text-gray-500">
                Create, edit, and manage programs for this organization.
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Org Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Create form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Draft Program
            </h2>
            <p className="text-sm text-gray-500">
              Drafts must be reviewed/approved before publishing.
            </p>
          </div>
          <form
            onSubmit={handleCreate}
            className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g., 2026 Auditions"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as "audition" | "scholarship",
                  }))
                }
              >
                <option value="audition">Audition</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Brief description…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Opens
              </label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={form.open_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, open_at: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Closes
              </label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={form.close_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, close_at: e.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create Draft"}
              </button>

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              {successMsg && (
                <p className="text-sm text-green-600">{successMsg}</p>
              )}
            </div>
          </form>
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
                  const status = getReviewStatus(p);
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
                              {p.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-400">
                                {p.type}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  status === "submitted"
                                    ? "bg-blue-100 text-blue-800"
                                    : status === "pending_changes"
                                    ? "bg-orange-100 text-orange-800"
                                    : status === "changes_requested"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : status === "unpublished"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {status.replace("_", " ")}
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
                          {p.deleted_at
                            ? new Date(p.deleted_at).toLocaleDateString()
                            : "Unknown"}
                        </span>
                        <Link
                          to={`/org/${orgSlug}/admin/programs/${p.id}/builder`}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => onRestore(p.id)}
                          className="text-indigo-600 hover:underline text-sm font-medium"
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

        {/* List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Programs for {orgName}
              </h2>
              <div className="text-sm text-gray-600">
                {success && <span className="text-green-700">{success}</span>}
                {listError && <span className="text-red-700">{listError}</span>}
              </div>
            </div>
          </div>

          {listError ? (
            <div className="p-6">
              <p className="text-sm text-red-600">{listError}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hasPrograms ? (
                    programs.map((p) => (
                      <tr key={p.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {p.type}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const status = getReviewStatus(p);
                            return (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  status === "submitted"
                                    ? "bg-blue-100 text-blue-800"
                                    : status === "pending_changes"
                                    ? "bg-orange-100 text-orange-800"
                                    : status === "changes_requested"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : status === "unpublished"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {status.replace("_", " ")}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.published
                                ? p.published_scope === "coalition"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : p.published_scope === "org"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {p.published
                              ? p.published_scope ?? "published"
                              : "draft"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {p.open_at
                            ? new Date(p.open_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {p.close_at
                            ? new Date(p.close_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/org/${orgSlug}/admin/programs/${p.id}/builder`}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Edit application
                            </Link>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="text-red-600 hover:text-red-800 p-1 ml-2"
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
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-sm text-gray-500"
                      >
                        No programs yet. Create your first draft above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
