// src/pages/admin/AdminPrograms.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  adminListMyPrograms,
  orgCreateProgramDraft,
  orgUpdateProgramDraft,
  orgSubmitProgramForReview,
  getReviewStatus,
  Program,
} from "../../lib/programs";
import { Link } from "react-router-dom";

type DraftForm = {
  organization_id: string;
  name: string;
  type: "audition" | "scholarship";
  description: string;
  open_at: string | null;
  close_at: string | null;
};

const emptyForm: DraftForm = {
  organization_id: "",
  name: "",
  type: "audition",
  description: "",
  open_at: null,
  close_at: null,
};

export default function AdminPrograms() {
  const [list, setList] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListMyPrograms();
      setList(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const canEdit = (p: Program) => {
    const st = getReviewStatus(p);
    return st === "draft" || st === "changes_requested";
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      if (!form.organization_id || !form.name) {
        throw new Error("Organization and name are required");
      }
      await orgCreateProgramDraft({
        organization_id: form.organization_id,
        name: form.name,
        type: form.type,
        description: form.description || null,
        open_at: form.open_at,
        close_at: form.close_at,
        metadata: {},
      });
      setForm(emptyForm);
      setSuccess("Draft created");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(p: Program) {
    setBusyId(p.id);
    setError(null);
    setSuccess(null);
    const name =
      (document.getElementById(`name-${p.id}`) as HTMLInputElement)?.value ||
      p.name;
    const type = (document.getElementById(`type-${p.id}`) as HTMLSelectElement)
      ?.value as "audition" | "scholarship";
    const description =
      (document.getElementById(`desc-${p.id}`) as HTMLTextAreaElement)?.value ||
      p.description ||
      "";
    try {
      await orgUpdateProgramDraft({
        program_id: p.id,
        name,
        type,
        description,
        open_at: p.open_at,
        close_at: p.close_at,
        metadata: p.metadata ?? {},
      });
      setSuccess("Draft saved");
      setEditId(null);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitForReview(p: Program) {
    setBusyId(p.id);
    setError(null);
    setSuccess(null);
    try {
      await orgSubmitProgramForReview({ program_id: p.id, note: null });
      setSuccess("Submitted for super review");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Programs
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create drafts, edit, and submit for review
              </p>
            </div>
            <Link
              to="/admin"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Back to Admin
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

        {/* Create draft */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Program Draft
            </h2>
          </div>
          <form onSubmit={handleCreate} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization ID *
                </label>
                <input
                  required
                  placeholder="Organization ID (UUID)"
                  className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.organization_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, organization_id: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program Name *
                </label>
                <input
                  required
                  placeholder="Program name"
                  className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Description (optional)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Open Date
                </label>
                <input
                  type="date"
                  className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.open_at || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, open_at: e.target.value || null }))
                  }
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Close Date
                </label>
                <input
                  type="date"
                  className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.close_at || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, close_at: e.target.value || null }))
                  }
                />
              </div>
              <div className="md:col-span-6 flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors h-10"
                >
                  {creating ? "Creating..." : "Create Draft"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Programs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Name
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
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-3 sm:px-6 py-4" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td className="px-3 sm:px-6 py-4" colSpan={5}>
                      No programs yet.
                    </td>
                  </tr>
                ) : (
                  list.map((p) => {
                    const st = getReviewStatus(p);
                    const editable = canEdit(p);
                    return (
                      <tr key={p.id}>
                        <td className="px-3 sm:px-6 py-4">
                          {editId === p.id ? (
                            <input
                              id={`name-${p.id}`}
                              defaultValue={p.name}
                              className="w-full h-8 border border-gray-300 rounded px-2 text-sm"
                            />
                          ) : (
                            <div className="font-medium text-sm">{p.name}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          {editId === p.id ? (
                            <select
                              id={`type-${p.id}`}
                              defaultValue={p.type}
                              className="w-full h-8 border border-gray-300 rounded px-2 text-sm"
                            >
                              <option value="audition">Audition</option>
                              <option value="scholarship">Scholarship</option>
                            </select>
                          ) : (
                            <span className="text-gray-700 capitalize text-sm">
                              {p.type}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <span
                            className={
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                              (st === "draft"
                                ? "bg-gray-100 text-gray-800"
                                : st === "submitted"
                                ? "bg-blue-100 text-blue-800"
                                : st === "changes_requested"
                                ? "bg-yellow-100 text-yellow-800"
                                : st === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800")
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
                            {editable &&
                              (editId === p.id ? (
                                <>
                                  <button
                                    disabled={busyId === p.id}
                                    onClick={() => handleSave(p)}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
                                  >
                                    {busyId === p.id ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setEditId(p.id)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs px-3 py-1.5 rounded"
                                >
                                  Edit
                                </button>
                              ))}
                            {editable && (
                              <button
                                disabled={busyId === p.id}
                                onClick={() => handleSubmitForReview(p)}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
                              >
                                {busyId === p.id
                                  ? "Submitting..."
                                  : "Submit for Review"}
                              </button>
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
