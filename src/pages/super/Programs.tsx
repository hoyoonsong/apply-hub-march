import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listPrograms,
  createProgram,
  listOrgs,
  isBackendUpdatingError,
} from "../../services/super";

interface Program {
  id: string;
  organization_id: string;
  name: string;
  type: "audition" | "scholarship";
  description: string | null;
  open_at: string | null;
  close_at: string | null;
  published: boolean;
  created_at: string;
  organization_name: string;
  organization_slug: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [organizationId, setOrganizationId] = useState("");
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"audition" | "scholarship">("audition");
  const [description, setDescription] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [programsData, orgsData] = await Promise.all([
        listPrograms(),
        listOrgs(false),
      ]);
      setPrograms(programsData);
      setOrgs(orgsData);
    } catch (err) {
      if (isBackendUpdatingError(err)) {
        setError("Backend updating—please refresh in a second.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data");
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
    if (!organizationId || !name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createProgram({
        orgId: organizationId,
        name: name.trim(),
        type: type,
        description: description.trim() || undefined,
        openAt: openAt || null,
        closeAt: closeAt || null,
        published: published,
      });
      setSuccess("Program created successfully");
      setOrganizationId("");
      setOrgSearchTerm("");
      setName("");
      setType("audition");
      setDescription("");
      setOpenAt("");
      setCloseAt("");
      setPublished(false);
      await loadData();
    } catch (err) {
      if (isBackendUpdatingError(err)) {
        setError("Backend updating—please refresh in a second.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to create program"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter((org) =>
    org.name.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  const isOpen = (program: Program) => {
    if (!program.open_at || !program.close_at) return false;
    const now = new Date();
    const openDate = new Date(program.open_at);
    const closeDate = new Date(program.close_at);
    return now >= openDate && now <= closeDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading programs...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage auditions and scholarships
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

        {/* Create Program Form */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Program
            </h2>
          </div>
          <form onSubmit={handleCreate} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    value={orgSearchTerm}
                    onChange={(e) => setOrgSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {orgSearchTerm && filteredOrgs.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredOrgs.slice(0, 3).map((org) => (
                        <div
                          key={org.id}
                          className={`px-3 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                            organizationId === org.id
                              ? "bg-blue-50 border-blue-200"
                              : ""
                          }`}
                          onClick={() => setOrganizationId(org.id)}
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
                            {organizationId === org.id && (
                              <div className="text-blue-600">
                                <svg
                                  className="w-4 h-4"
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
                  ) : orgSearchTerm ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No organizations found matching your search
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Program name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "audition" | "scholarship")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="audition">Audition</option>
                  <option value="scholarship">Scholarship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Open Date
                </label>
                <input
                  type="date"
                  value={openAt}
                  onChange={(e) => setOpenAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Close Date
                </label>
                <input
                  type="date"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="published"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Published
                </label>
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
                placeholder="Program description"
              />
            </div>
            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                {submitting ? "Creating..." : "Create Program"}
              </button>
            </div>
          </form>
        </div>

        {/* Programs Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Programs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Org
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Window
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Is Open
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {program.organization_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {program.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          program.type === "audition"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {program.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          program.published
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {program.published ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs">
                        {program.open_at
                          ? new Date(program.open_at).toLocaleDateString()
                          : "-"}
                        {program.open_at && program.close_at && " to "}
                        {program.close_at
                          ? new Date(program.close_at).toLocaleDateString()
                          : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isOpen(program)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isOpen(program) ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(program.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
