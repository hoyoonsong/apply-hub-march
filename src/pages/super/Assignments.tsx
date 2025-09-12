import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Tab = "org-admins" | "coalition-managers" | "reviewers";

type Org = { id: string; name: string; slug: string };
type Coalition = { id: string; name: string; slug: string };
type Program = {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
};
type User = { id: string; full_name: string; role: string };

export default function Assignments() {
  const [activeTab, setActiveTab] = useState<Tab>("org-admins");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [coalitions, setCoalitions] = useState<Coalition[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedCoalitionId, setSelectedCoalitionId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"active" | "revoked">("active");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [orgsRes, coalitionsRes, programsRes, usersRes] = await Promise.all(
        [
          supabase.rpc("super_list_orgs_v1", { include_deleted: false }),
          supabase.rpc("super_list_coalitions_v1", { include_deleted: false }),
          supabase.rpc("super_list_programs_v1", { include_deleted: false }),
          supabase.rpc("super_list_users_v1", {
            p_search: null,
            p_role_filter: null,
            p_limit: 1000,
            p_offset: 0,
          }),
        ]
      );

      if (orgsRes.error) throw new Error(orgsRes.error.message);
      if (coalitionsRes.error) throw new Error(coalitionsRes.error.message);
      if (programsRes.error) throw new Error(programsRes.error.message);
      if (usersRes.error) throw new Error(usersRes.error.message);

      setOrgs(orgsRes.data ?? []);
      setCoalitions(coalitionsRes.data ?? []);
      setPrograms(programsRes.data ?? []);
      setUsers(usersRes.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addOrgAdmin() {
    if (!selectedOrgId || !userId) return;

    try {
      const { error } = await supabase.rpc("super_upsert_org_admin_v1", {
        p_org_id: selectedOrgId,
        p_user_id: userId,
        p_status: status,
      });

      if (error) throw error;
      setSuccess("Organization admin added successfully");
      setSelectedOrgId("");
      setUserId("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addCoalitionManager() {
    if (!selectedCoalitionId || !userId) return;

    try {
      const { error } = await supabase.rpc(
        "super_upsert_coalition_manager_v1",
        {
          p_coalition_id: selectedCoalitionId,
          p_user_id: userId,
          p_status: status,
        }
      );

      if (error) throw error;
      setSuccess("Coalition manager added successfully");
      setSelectedCoalitionId("");
      setUserId("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addReviewer() {
    if (!selectedProgramId && !selectedOrgId) return;
    if (!userId) return;

    try {
      const scopeType = selectedProgramId ? "program" : "org";
      const scopeId = selectedProgramId || selectedOrgId;

      const { error } = await supabase.rpc("super_upsert_reviewer_v1", {
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_user_id: userId,
        p_status: status,
      });

      if (error) {
        if (
          error.message.includes("function") &&
          error.message.includes("does not exist")
        ) {
          throw new Error(
            "Reviewer assignment RPC not available yet. Please contact your administrator."
          );
        }
        throw error;
      }
      setSuccess("Reviewer added successfully");
      setSelectedProgramId("");
      setSelectedOrgId("");
      setUserId("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  const tabs = [
    { id: "org-admins" as Tab, label: "Org Admins" },
    { id: "coalition-managers" as Tab, label: "Coalition Managers" },
    { id: "reviewers" as Tab, label: "Reviewers" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Assignments
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage user roles and permissions
              </p>
            </div>
            <Link
              to="/super"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 text-red-800 border border-red-200 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-800 border border-green-200 px-4 py-3 rounded-md mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Org Admins Tab */}
            {activeTab === "org-admins" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Organization Admin
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select organization</option>
                      {orgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Paste user UUID"
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as "active" | "revoked")
                      }
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addOrgAdmin}
                      disabled={!selectedOrgId || !userId}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      Add Admin
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Coalition Managers Tab */}
            {activeTab === "coalition-managers" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Coalition Manager
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coalition
                    </label>
                    <select
                      value={selectedCoalitionId}
                      onChange={(e) => setSelectedCoalitionId(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select coalition</option>
                      {coalitions.map((coalition) => (
                        <option key={coalition.id} value={coalition.id}>
                          {coalition.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Paste user UUID"
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as "active" | "revoked")
                      }
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addCoalitionManager}
                      disabled={!selectedCoalitionId || !userId}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      Add Manager
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewers Tab */}
            {activeTab === "reviewers" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Reviewer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        setSelectedOrgId(e.target.value);
                        setSelectedProgramId("");
                      }}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select organization</option>
                      {orgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program (optional)
                    </label>
                    <select
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                      disabled={!selectedOrgId}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">All programs</option>
                      {programs
                        .filter((p) => p.organization_id === selectedOrgId)
                        .map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Paste user UUID"
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as "active" | "revoked")
                      }
                      className="w-full h-10 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addReviewer}
                      disabled={
                        (!selectedOrgId && !selectedProgramId) || !userId
                      }
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      Add Reviewer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
