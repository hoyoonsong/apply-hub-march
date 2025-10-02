import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listOrgs,
  createOrg,
  softDeleteOrg,
  restoreOrg,
  isBackendUpdatingError,
} from "../../services/super";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

export default function Orgs() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [deletedOrgs, setDeletedOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const allOrgs = await listOrgs(true); // Get all orgs including deleted

      // Split client-side into active and deleted
      const activeOrgs = allOrgs.filter(
        (org: Organization) => org.deleted_at === null
      );
      const deletedOrgs = allOrgs.filter(
        (org: Organization) => org.deleted_at !== null
      );

      setOrgs(activeOrgs);
      setDeletedOrgs(deletedOrgs);
    } catch (err) {
      if (isBackendUpdatingError(err)) {
        setError("Backend updating—please refresh in a second.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load organizations"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createOrg({
        p_name: name.trim(),
        p_slug: slug.trim(),
        p_description: description.trim() || undefined,
      });
      setSuccess("Organization created successfully");
      setName("");
      setSlug("");
      setDescription("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      setError(null);
      await softDeleteOrg({ p_org_id: id });
      setSuccess("Organization deleted successfully");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete organization"
      );
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setError(null);
      await restoreOrg({ p_org_id: id });
      setSuccess("Organization restored successfully");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restore organization"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">
                Organizations
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage drum corps organizations
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

        {/* Create Organization Form */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Organization
            </h2>
          </div>
          <form onSubmit={handleCreate} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Organization name"
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
                  placeholder="organization-slug"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Organization description"
              />
            </div>
            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors h-10"
              >
                {submitting ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </form>
        </div>

        {/* Active Organizations */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Organizations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Slug
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Description
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] hidden sm:table-cell">
                    Created
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 w-[150px]">
                      <div className="truncate">{org.name}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 w-[120px]">
                      <div className="truncate">{org.slug}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 min-w-[200px]">
                      <div className="truncate">{org.description || "-"}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 w-[100px] hidden sm:table-cell">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right text-sm font-medium w-[80px]">
                      <button
                        onClick={() => handleSoftDelete(org.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deleted Organizations */}
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
              Deleted Organizations ({deletedOrgs.length})
            </button>
          </div>
          {showDeleted && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedOrgs.map((org) => (
                    <tr key={org.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {org.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {org.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRestore(org.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
