// src/pages/org-admin/OrgAdminPrograms.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getOrgBySlug } from "../../lib/orgs";
import {
  orgCreateProgramDraft,
  getReviewStatus,
  Program,
} from "../../lib/programs";
import { supabase } from "../../lib/supabase";
import AutoLinkText from "../../components/AutoLinkText";

type ProgramWithDeleted = Program & {
  deleted_at?: string | null;
};
import {
  adminListPrograms,
  adminSoftDeleteProgram,
  adminRestoreProgram,
} from "../../services/admin";

type CreateState = {
  name: string;
  type: "audition" | "scholarship" | "application" | "competition";
  description: string;
  open_at: string; // datetime-local value
  close_at: string; // datetime-local value
  is_private: boolean;
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
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState<CreateState>({
    name: "",
    type: "audition",
    description: "",
    open_at: "",
    close_at: "",
    is_private: false,
  });

  // Small helper: convert datetime-local to ISO or undefined
  const toISOorNull = (v: string) =>
    v ? new Date(v).toISOString() : undefined;

  // Helper function to convert database errors to user-friendly messages
  const getUserFriendlyError = (error: any): string => {
    const message = error?.message || "";

    // Check for specific database constraint violations
    if (
      message.includes("programs_org_name_idx") ||
      message.includes("duplicate key value violates unique constraint")
    ) {
      return "A program with this name already exists. Please choose a different name.";
    }

    if (message.includes("foreign key constraint")) {
      return "There was an issue with the program data. Please try again.";
    }

    if (message.includes("not null constraint")) {
      return "Please fill in all required fields.";
    }

    if (message.includes("check constraint")) {
      return "Please check your input values and try again.";
    }

    if (
      message.includes("permission denied") ||
      message.includes("insufficient_privilege")
    ) {
      return "You don't have permission to perform this action.";
    }

    if (message.includes("connection") || message.includes("timeout")) {
      return "Connection issue. Please check your internet and try again.";
    }

    // For other errors, return a generic message
    return "Something went wrong. Please try again.";
  };

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

        // Auto-migrate: Check each program and migrate is_private from metadata to column if needed
        const migrationPromises = rows
          .filter((p: any) => {
            const metadataIsPrivate = !!(p.metadata as any)?.is_private;
            const columnIsPrivate = !!(p as any).is_private;
            return metadataIsPrivate && !columnIsPrivate;
          })
          .map((p: any) =>
            supabase
              .from("programs")
              .update({ is_private: true })
              .eq("id", p.id)
              .then(({ error }) => {
                if (error) {
                  console.warn(`Failed to migrate is_private for program ${p.id}:`, error);
                } else {
                  // Update the row in memory so UI reflects the change immediately
                  (p as any).is_private = true;
                }
              })
          );

        // Wait for migrations to complete (non-blocking - don't fail if migration fails)
        await Promise.allSettled(migrationPromises);

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
        setListError(getUserFriendlyError(e));
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
    if (!orgId || !orgSlug) return;
    setCreating(true);
    setCreateError(null);
    setSuccessMsg(null);

    try {
      if (!form.name.trim()) {
        setCreateError("Program name is required.");
        setCreating(false);
        return;
      }

      const newProgram = await orgCreateProgramDraft({
        organization_id: orgId,
        name: form.name,
        type: form.type,
        description: form.description || undefined,
        open_at: toISOorNull(form.open_at),
        close_at: toISOorNull(form.close_at),
      });

      // Update is_private after creation (since RPC might not support it)
      if (form.is_private) {
        await supabase
          .from("programs")
          .update({ is_private: true })
          .eq("id", newProgram.id);
      }

      // Reset form
      setForm({
        name: "",
        type: "audition",
        description: "",
        open_at: "",
        close_at: "",
        is_private: false,
      });

      // Redirect to the application editor immediately
      navigate(`/org/${orgSlug}/admin/programs/${newProgram.id}/builder`);
    } catch (e: any) {
      // If forbidden from creating, bounce to unauthorized
      if (e?.code === "42501" || `${e?.message ?? ""}`.includes("forbidden")) {
        navigate("/unauthorized", { replace: true });
        return;
      }
      setCreateError(getUserFriendlyError(e));
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
      setListError(getUserFriendlyError(e));
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
      setListError(getUserFriendlyError(e));
    }
  };

  // Filter programs based on search term
  const filteredPrograms = useMemo(() => {
    if (!searchTerm.trim()) return programs;
    const term = searchTerm.toLowerCase();
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.type.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [programs, searchTerm]);

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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {orgName} — Programs
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, edit, and manage programs for this organization.
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Org Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Create form - Enhanced Program Basics style */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/60 rounded-2xl p-6 shadow-lg shadow-indigo-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Create New Program
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Set up your program details and jump straight into building
              </p>
            </div>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Title
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g., 2026 Auditions"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Type
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as
                        | "audition"
                        | "scholarship"
                        | "application"
                        | "competition",
                    }))
                  }
                >
                  <option value="audition">Audition</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="application">Application</option>
                  <option value="competition">Competition</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Opens
                </label>
                <input
                  type="datetime-local"
                  step="60"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  value={form.open_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, open_at: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Closes
                </label>
                <input
                  type="datetime-local"
                  step="60"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  value={form.close_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, close_at: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description…"
                />
              </div>
              <div className="md:col-span-12">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600"
                    checked={form.is_private}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_private: e.target.checked }))
                    }
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800">
                      Private Program
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Private programs won't appear on the homepage or in public listings. They can only be accessed via direct link.
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {createError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">
                      {createError}
                    </p>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-green-700 font-medium">
                      {successMsg}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating…
                  </>
                ) : (
                  <>
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create & Open Editor
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Deleted Programs Section */}
        <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className="flex items-center gap-3 text-lg font-bold text-gray-900 hover:text-gray-700 transition-colors duration-150"
            >
              <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${
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
                              <AutoLinkText text={p.description || ""} />
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
                                    : status === "published"
                                    ? "bg-green-100 text-green-800"
                                    : status === "unpublished"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {(status === "pending_changes"
                                  ? "update"
                                  : status
                                ).replace("_", " ")}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  p.published
                                    ? (() => {
                                        const columnValue = (p as any).is_private;
                                        const isPrivate = columnValue === true || 
                                                        (columnValue === null || columnValue === undefined) && (p.metadata as any)?.is_private === true;
                                        return isPrivate;
                                      })()
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {p.published
                                  ? (() => {
                                      const columnValue = (p as any).is_private;
                                      const isPrivate = columnValue === true || 
                                                      (columnValue === null || columnValue === undefined) && (p.metadata as any)?.is_private === true;
                                      return isPrivate;
                                    })()
                                    ? "Private"
                                    : "Public"
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-900">
                  Programs for {orgName}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  {success && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {success}
                    </span>
                  )}
                  {listError && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {listError}
                    </span>
                  )}
                </div>

                {/* Search Bar - anchored to the rightmost side */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search programs..."
                      className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Opens
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Closes
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPrograms.length > 0 ? (
                    filteredPrograms.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-5 text-sm text-gray-900 text-center">
                          <Link
                            to={`/org/${orgSlug}/admin/programs/${p.id}/builder`}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors duration-150"
                            title="Open application editor"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-700 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {(() => {
                            const status = getReviewStatus(p);
                            return (
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                  status === "submitted"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : status === "pending_changes"
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : status === "changes_requested"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                    : status === "published"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : status === "unpublished"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-gray-100 text-gray-800 border border-gray-200"
                                }`}
                              >
                                {(status === "pending_changes"
                                  ? "update"
                                  : status
                                ).replace("_", " ")}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {(() => {
                            // Column takes precedence - if column exists (even if false), use it
                            // Only check metadata if column is explicitly null/undefined (not false)
                            const columnValue = (p as any).is_private;
                            const isPrivate = columnValue === true || 
                                            (columnValue === null || columnValue === undefined) && (p.metadata as any)?.is_private === true;
                            return (
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                  p.published
                                    ? isPrivate
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                    : "bg-gray-100 text-gray-800 border border-gray-200"
                                }`}
                              >
                                {p.published
                                  ? isPrivate
                                    ? "Private"
                                    : "Public"
                                  : "Draft"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600 text-center font-medium">
                          {p.open_at
                            ? new Date(p.open_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600 text-center font-medium">
                          {p.close_at
                            ? new Date(p.close_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-6 py-5 text-center text-sm text-gray-500">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-5 text-center text-sm">
                          <div className="flex items-center justify-center gap-3">
                            <Link
                              to={`/org/${orgSlug}/admin/programs/${p.id}/builder`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors duration-150"
                              title="Edit application"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
                            </Link>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-150"
                              title="Delete program"
                            >
                              <svg
                                className="w-3 h-3"
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
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {searchTerm
                                ? "No matching programs"
                                : "No programs yet"}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {searchTerm
                                ? `No programs match "${searchTerm}". Try a different search term.`
                                : "Create your first program using the form above to get started."}
                            </p>
                          </div>
                        </div>
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
