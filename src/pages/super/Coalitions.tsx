import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listCoalitions,
  listOrgs,
  listCoalitionMembers,
  createCoalition,
  softDeleteCoalition,
  restoreCoalition,
  addOrgToCoalition,
  removeOrgFromCoalition,
  isBackendUpdatingError,
} from "../../services/super";

interface Coalition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CoalitionMember {
  coalition_id: string;
  organization_id: string;
  member_since: string;
  name: string;
}

export default function Coalitions() {
  const [coalitions, setCoalitions] = useState<Coalition[]>([]);
  const [deletedCoalitions, setDeletedCoalitions] = useState<Coalition[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [members, setMembers] = useState<CoalitionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCoalition, setSelectedCoalition] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add member state
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgSearchTerm, setOrgSearchTerm] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [allCoalitions, orgsData] = await Promise.all([
        listCoalitions(true), // Get all coalitions including deleted
        listOrgs(false),
      ]);

      // Split client-side into active and deleted
      const activeCoalitions = allCoalitions.filter(
        (coalition) => coalition.deleted_at === null
      );
      const deletedCoalitions = allCoalitions.filter(
        (coalition) => coalition.deleted_at !== null
      );

      setCoalitions(activeCoalitions);
      setDeletedCoalitions(deletedCoalitions);
      setOrgs(orgsData);
    } catch (err) {
      if (isBackendUpdatingError(err)) {
        setError("Backend updating—please refresh in a second.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load coalitions"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (coalitionId: string) => {
    try {
      const membersData = await listCoalitionMembers(coalitionId);
      setMembers(membersData);
    } catch (err) {
      if (isBackendUpdatingError(err)) {
        setError("Backend updating—please refresh in a second.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load coalition members"
        );
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCoalition) {
      loadMembers(selectedCoalition);
    } else {
      setMembers([]);
    }
  }, [selectedCoalition]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createCoalition({
        p_name: name.trim(),
        p_slug: slug.trim(),
        p_description: description.trim() || undefined,
      });
      setSuccess("Coalition created successfully");
      setName("");
      setSlug("");
      setDescription("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create coalition"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      setError(null);
      await softDeleteCoalition({ p_coalition_id: id });
      setSuccess("Coalition deleted successfully");
      if (selectedCoalition === id) {
        setSelectedCoalition(null);
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete coalition"
      );
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setError(null);
      await restoreCoalition({ p_coalition_id: id });
      setSuccess("Coalition restored successfully");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restore coalition"
      );
    }
  };

  const handleAddMember = async () => {
    if (!selectedCoalition || !selectedOrgId) return;

    try {
      setError(null);
      await addOrgToCoalition({
        p_coalition_id: selectedCoalition,
        p_org_id: selectedOrgId,
      });
      setSuccess("Organization added to coalition");
      setSelectedOrgId("");
      await loadMembers(selectedCoalition);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add organization"
      );
    }
  };

  const handleRemoveMember = async (orgId: string) => {
    if (!selectedCoalition) return;

    try {
      setError(null);
      await removeOrgFromCoalition({
        p_coalition_id: selectedCoalition,
        p_org_id: orgId,
      });
      setSuccess("Organization removed from coalition");
      await loadMembers(selectedCoalition);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove organization"
      );
    }
  };

  const availableOrgs = orgs.filter(
    (org) =>
      !members.some((member) => member.organization_id === org.id) &&
      org.name.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading coalitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coalitions</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage organization groups
              </p>
            </div>
            <Link
              to="/super"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Coalitions Management */}
          <div className="space-y-8">
            {/* Create Coalition Form */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Coalition
                </h2>
              </div>
              <form onSubmit={handleCreate} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Coalition name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="coalition-slug"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Coalition description"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors h-10"
                  >
                    {submitting ? "Creating..." : "Create Coalition"}
                  </button>
                </div>
              </form>
            </div>

            {/* Active Coalitions */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Coalitions
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {coalitions.map((coalition) => (
                  <div
                    key={coalition.id}
                    className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                      selectedCoalition === coalition.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedCoalition(coalition.id)}
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {coalition.name}
                      </h3>
                      {coalition.description && (
                        <p className="text-xs text-gray-400 mt-1">
                          {coalition.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSoftDelete(coalition.id);
                        }}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deleted Coalitions */}
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
                  Deleted Coalitions ({deletedCoalitions.length})
                </button>
              </div>
              {showDeleted && (
                <div className="divide-y divide-gray-200">
                  {deletedCoalitions.map((coalition) => (
                    <div
                      key={coalition.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {coalition.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {coalition.slug}
                        </p>
                        {coalition.description && (
                          <p className="text-xs text-gray-400 mt-1">
                            {coalition.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRestore(coalition.id)}
                        className="text-green-600 hover:text-green-900 text-sm"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Membership Management */}
          <div className="space-y-8">
            {selectedCoalition ? (
              <>
                {/* Current Members */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Current Members
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {members.map((member) => (
                      <div
                        key={member.organization_id}
                        className="px-6 py-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {member.name ||
                              `Organization ${member.organization_id.slice(
                                0,
                                8
                              )}...`}
                          </h3>
                          <p className="text-xs text-gray-400">
                            Added{" "}
                            {member.member_since
                              ? new Date(
                                  member.member_since
                                ).toLocaleDateString()
                              : "Unknown date"}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveMember(member.organization_id)
                          }
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div className="px-6 py-4 text-center text-gray-500">
                        No members yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Organization */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Add Organization
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Search organizations..."
                          value={orgSearchTerm}
                          onChange={(e) => setOrgSearchTerm(e.target.value)}
                          className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {availableOrgs.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                          {availableOrgs.slice(0, 3).map((org) => (
                            <div
                              key={org.id}
                              className={`px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                                selectedOrgId === org.id
                                  ? "bg-blue-50 border-blue-200"
                                  : ""
                              }`}
                              onClick={() => setSelectedOrgId(org.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {org.name}
                                  </h3>
                                  {org.description && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {org.description}
                                    </p>
                                  )}
                                </div>
                                {selectedOrgId === org.id && (
                                  <div className="text-blue-600">
                                    <svg
                                      className="w-5 h-5"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {orgSearchTerm
                            ? "No organizations found matching your search"
                            : "All organizations are already members"}
                        </div>
                      )}

                      <button
                        onClick={handleAddMember}
                        disabled={!selectedOrgId}
                        className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Add Selected Organization
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Coalition
                </h3>
                <p className="text-gray-500">
                  Choose a coalition from the list to manage its members
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
