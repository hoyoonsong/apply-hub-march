import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { orgCreateProgramDraft } from "../lib/programs";
import { supabase } from "../lib/supabase";
import { adminListPrograms } from "../services/admin";

type CreateState = {
  name: string;
  type: "audition" | "scholarship" | "application" | "competition";
  open_at: string;
  close_at: string;
  is_private: boolean;
  spots_mode: "exact" | "unlimited" | "tbd";
  spots_count: string;
};

interface CreateProgramModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  orgSlug: string | null;
  onSuccess?: () => void; // Optional callback after successful creation
}

export default function CreateProgramModal({
  open,
  onClose,
  orgId,
  orgSlug,
  onSuccess,
}: CreateProgramModalProps) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<CreateState>({
    name: "",
    type: "audition",
    open_at: "",
    close_at: "",
    is_private: false,
    spots_mode: "exact",
    spots_count: "",
  });

  // Helper to convert datetime-local to ISO or undefined
  const toISOorNull = (v: string) =>
    v ? new Date(v).toISOString() : undefined;

  // Helper function to convert database errors to user-friendly messages
  const getUserFriendlyError = (error: any): string => {
    const message = error?.message || "";

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

    return "Something went wrong. Please try again.";
  };

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

      // Validate spots if mode is exact
      if (form.spots_mode === "exact") {
        const spotsNum = parseInt(form.spots_count, 10);
        if (isNaN(spotsNum) || spotsNum < 0) {
          setCreateError(
            "Please enter a valid number of spots (0 or greater)."
          );
          setCreating(false);
          return;
        }
      }

      const newProgram = await orgCreateProgramDraft({
        organization_id: orgId,
        name: form.name,
        type: form.type,
        open_at: toISOorNull(form.open_at),
        close_at: toISOorNull(form.close_at),
        spots_mode: form.spots_mode,
        spots_count:
          form.spots_mode === "exact" ? parseInt(form.spots_count, 10) : null,
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
        open_at: "",
        close_at: "",
        is_private: false,
        spots_mode: "exact",
        spots_count: "",
      });

      // Close modal
      onClose();

      // Call onSuccess callback if provided (for pages that need to refresh)
      if (onSuccess) {
        onSuccess();
      }

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Create New Program
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Set up your program details and jump straight into building
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleCreate}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g., 2026 Auditions"
                    required
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Type <span className="text-red-500">*</span>
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
                    disabled={creating}
                  >
                    <option value="audition">Audition</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="application">Application</option>
                    <option value="competition">Competition</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Opens
                  </label>
                  <input
                    type="datetime-local"
                    step="60"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={form.open_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, open_at: e.target.value }))
                    }
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Closes
                  </label>
                  <input
                    type="datetime-local"
                    step="60"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={form.close_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, close_at: e.target.value }))
                    }
                    disabled={creating}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Available Spots <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="spots_mode"
                        className="h-4 w-4 text-indigo-600"
                        checked={form.spots_mode === "exact"}
                        onChange={() =>
                          setForm((f) => ({ ...f, spots_mode: "exact" }))
                        }
                        disabled={creating}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800">
                            Exact Number
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          className={`w-20 rounded-lg border px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                            form.spots_mode === "exact"
                              ? "border-gray-300 text-gray-900"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                          value={form.spots_count}
                          onChange={(e) => {
                            e.stopPropagation();
                            setForm((f) => ({
                              ...f,
                              spots_count: e.target.value,
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Spots"
                          required={form.spots_mode === "exact"}
                          disabled={creating || form.spots_mode !== "exact"}
                        />
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="spots_mode"
                        className="h-4 w-4 text-indigo-600"
                        checked={form.spots_mode === "unlimited"}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            spots_mode: "unlimited",
                          }))
                        }
                        disabled={creating}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">
                          Unlimited
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="spots_mode"
                        className="h-4 w-4 text-indigo-600"
                        checked={form.spots_mode === "tbd"}
                        onChange={() =>
                          setForm((f) => ({ ...f, spots_mode: "tbd" }))
                        }
                        disabled={creating}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">
                          To Be Determined
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Privacy
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600"
                    checked={form.is_private}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_private: e.target.checked,
                      }))
                    }
                    disabled={creating}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800">
                      Private Program
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Won't appear on homepage or public listings
                    </p>
                  </div>
                </label>
              </div>
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
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
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
      </div>
    </div>
  );
}

