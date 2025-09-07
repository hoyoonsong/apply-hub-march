import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  listUserAssignments,
  listAllOrgs,
  listProgramsByOrg,
  listAllCoalitions,
  upsertOrgAdmin,
  upsertReviewer,
  upsertCoalitionManager,
  updateUserRoleV2,
  getEffectiveRoles,
} from "../../lib/assignments";

type UserRole =
  | "applicant"
  | "admin"
  | "reviewer"
  | "coalition_manager"
  | "superadmin";

type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

const ROLE_OPTIONS: UserRole[] = [
  "applicant",
  "admin",
  "reviewer",
  "coalition_manager",
  "superadmin",
];

// Simplified options for bulk role changes
const BULK_ROLE_OPTIONS = [
  { value: "superadmin", label: "Superadmin" },
  { value: "applicant", label: "User" },
];

function RolePills({
  profileRole,
  effective,
  isLoading = false,
}: {
  profileRole: string;
  effective: Awaited<ReturnType<typeof getEffectiveRoles>> | null;
  isLoading?: boolean;
}) {
  // If still loading, show a loading indicator
  if (isLoading || !effective) {
    return (
      <div className="flex gap-2 flex-wrap">
        <span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-xs">
          Loading...
        </span>
      </div>
    );
  }

  const pills: { label: string; active: boolean; klass: string }[] = [
    {
      label: "superadmin",
      active: profileRole === "superadmin" || effective.superadmin_from_profile,
      klass: "bg-purple-100 text-purple-800",
    },
    {
      label: "admin",
      active: effective.has_admin,
      klass: "bg-blue-100 text-blue-800",
    },
    {
      label: "reviewer",
      active: effective.has_reviewer,
      klass: "bg-green-100 text-green-800",
    },
    {
      label: "coalition_manager",
      active: effective.has_co_manager,
      klass: "bg-orange-100 text-orange-800",
    },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {pills
        .filter((p) => p.active)
        .map((p) => (
          <span
            key={p.label}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.klass}`}
          >
            {p.label}
          </span>
        ))}
      {!pills.some((p) => p.active) && (
        <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs">
          applicant
        </span>
      )}
    </div>
  );
}

function Banner({
  type,
  msg,
  onClose,
}: {
  type: "success" | "error";
  msg: string;
  onClose?: () => void;
}) {
  const cls =
    type === "success"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-red-50 text-red-800 border-red-200";
  return (
    <div
      className={`rounded-md p-4 border ${cls} flex items-start justify-between`}
    >
      <div className="pr-4">{msg}</div>
      {onClose && (
        <button className="text-sm underline" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export default function Users() {
  // data
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");

  // selection and row states
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  // expandable rows
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [effectiveCache, setEffectiveCache] = useState<Record<string, any>>({});

  // banners
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // debounce search input
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => setSearch(searchInput.trim()),
      300
    );
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  async function fetchUsers() {
    setLoading(true);
    setFetchError(null);
    setBanner(null);

    const { data, error } = await supabase.rpc("super_list_users_v1", {
      p_search: search === "" ? null : search,
      p_role_filter: null, // Don't filter by role on backend - we'll do it client-side
      p_limit: 1000, // Large limit instead of pagination
      p_offset: 0,
    });

    if (error) {
      setFetchError(error.message);
      setUsers([]);
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
    // reset selection when filters change
    setSelected({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]); // Only refetch when search changes, not roleFilter

  // Load effective roles for all users when users data changes
  useEffect(() => {
    if (users.length > 0) {
      // Load effective roles for all users in parallel
      Promise.all(
        users.map(async (user) => {
          try {
            const effective = await getEffectiveRoles(user.id);
            setEffectiveCache((prev) => ({ ...prev, [user.id]: effective }));
          } catch (error) {
            console.error(
              `Failed to load effective roles for user ${user.id}:`,
              error
            );
          }
        })
      );
    }
  }, [users]);

  // Filter users based on effective roles
  function filterUsersByEffectiveRole(
    users: Profile[],
    roleFilter: UserRole | ""
  ): Profile[] {
    if (roleFilter === "") return users;

    return users.filter((user) => {
      const effective = effectiveCache[user.id];
      if (!effective) return false; // Don't show users whose effective roles haven't loaded yet

      switch (roleFilter) {
        case "superadmin":
          return (
            user.role === "superadmin" || effective.superadmin_from_profile
          );
        case "admin":
          return effective.has_admin;
        case "reviewer":
          return effective.has_reviewer;
        case "coalition_manager":
          return effective.has_co_manager;
        case "applicant":
          // Show users who have no effective roles (only applicant)
          return (
            !effective.has_admin &&
            !effective.has_reviewer &&
            !effective.has_co_manager &&
            user.role !== "superadmin" &&
            !effective.superadmin_from_profile
          );
        default:
          return true;
      }
    });
  }

  // Get filtered users based on role filter
  const filteredUsers = filterUsersByEffectiveRole(users, roleFilter);

  // helpers
  function toggleSelectAll(check: boolean) {
    if (!check) {
      setSelected({});
      return;
    }
    const map: Record<string, boolean> = {};
    filteredUsers.forEach((u) => (map[u.id] = true));
    setSelected(map);
  }

  function setSelectedOne(id: string, check: boolean) {
    setSelected((m) => ({ ...m, [id]: check }));
  }

  async function loadEffective(userId: string) {
    try {
      const eff = await getEffectiveRoles(userId);
      setEffectiveCache((prev) => ({ ...prev, [userId]: eff }));
    } catch (error: any) {
      console.error("Failed to load effective roles:", error);
    }
  }

  async function onChangeRole(u: ProfileRow, newRole: string) {
    if (newRole === u.role) return;

    setRowBusy((m) => ({ ...m, [u.id]: true }));
    setBanner(null);

    try {
      if (newRole === "applicant") {
        const wipe = window.confirm(
          "Demote to applicant and revoke ALL assignments? OK = revoke, Cancel = keep assignments."
        );
        await updateUserRoleV2(u.id, "applicant", wipe, "all");
      } else {
        const { error } = await supabase.rpc("super_update_user_role_v2", {
          p_user_id: u.id,
          p_new_role: newRole,
          p_wipe: false,
          p_target: "all",
        });
        if (error) throw error;
      }
      setBanner({ type: "success", msg: "Role updated." });
      await fetchUsers();
      await loadEffective(u.id);
    } catch (error: any) {
      setBanner({ type: "error", msg: error.message });
    } finally {
      setRowBusy((m) => ({ ...m, [u.id]: false }));
    }
  }

  async function bulkChangeRole(newRole: UserRole) {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;

    setBanner(null);

    // optimistic update for all
    const prevById = new Map<string, UserRole>();
    setUsers((list) =>
      list.map((u) => {
        if (selected[u.id]) {
          prevById.set(u.id, u.role);
          return { ...u, role: newRole };
        }
        return u;
      })
    );

    // fire all updates (in parallel, but throttled by 10 to be polite)
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

    let hadError = false;
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (id) => {
          setRowBusy((m) => ({ ...m, [id]: true }));
          const { error } = await supabase.rpc("super_update_user_role_v1", {
            p_user_id: id,
            p_new_role: newRole,
          });
          setRowBusy((m) => ({ ...m, [id]: false }));
          if (error) {
            hadError = true;
            // revert this row
            const prev = prevById.get(id);
            if (prev) {
              setUsers((list) =>
                list.map((u) => (u.id === id ? { ...u, role: prev } : u))
              );
            }
          }
        })
      );
    }

    if (hadError) {
      setBanner({
        type: "error",
        msg: "Some updates failed. Changes were reverted for those rows.",
      });
    } else {
      setBanner({ type: "success", msg: "Roles updated." });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="mt-2 text-gray-600">
                Manage user accounts and their role assignments
              </p>
            </div>
            <Link
              to="/dashboard"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Back to Hub
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Filter
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value as UserRole | "")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All roles</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() +
                        role.slice(1).replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {Object.values(selected).some(Boolean) && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-4">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {Object.values(selected).filter(Boolean).length} selected
                    {roleFilter !== "" && ` (filtered by ${roleFilter})`}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as UserRole | "";
                      if (val) {
                        bulkChangeRole(val as UserRole);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Bulk change role...</option>
                    {BULK_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        Change to {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSelectAll(true)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => toggleSelectAll(false)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banners */}
        {banner && (
          <Banner
            type={banner.type}
            msg={banner.msg}
            onClose={() => setBanner(null)}
          />
        )}

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading users...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <span className="sr-only">Expand</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                      Effective Roles
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px] hidden sm:table-cell">
                      Created
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <React.Fragment key={u.id}>
                      <tr
                        className={`hover:bg-gray-50 ${
                          selected[u.id] ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-3 sm:px-6 py-4">
                          <button
                            onClick={() => {
                              setExpanded((e) => ({
                                ...e,
                                [u.id]: !e[u.id],
                              }));
                              if (!effectiveCache[u.id]) loadEffective(u.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className={`w-4 h-4 transform transition-transform ${
                                expanded[u.id] ? "rotate-90" : ""
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
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <input
                            type="checkbox"
                            checked={!!selected[u.id]}
                            onChange={(e) =>
                              setSelectedOne(u.id, e.target.checked)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4 w-[200px]">
                          <div className="flex items-center min-w-0">
                            <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs sm:text-sm font-medium text-gray-700">
                                  {(u.full_name || "U").charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {u.full_name || "Unnamed User"}
                              </div>
                              <div className="text-xs text-gray-500 font-mono truncate">
                                {u.id.substring(0, 8)}...
                              </div>
                              <div className="text-xs text-gray-400 sm:hidden">
                                {new Date(u.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 w-[200px]">
                          <RolePills
                            profileRole={u.role}
                            effective={effectiveCache[u.id] || null}
                            isLoading={!effectiveCache[u.id]}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell w-[140px]">
                          <div>
                            {new Date(u.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(u.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-center w-[100px]">
                          {rowBusy[u.id] ? (
                            <div className="inline-flex items-center text-xs sm:text-sm text-blue-600">
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600 mr-1 sm:mr-2"></div>
                              <span className="hidden sm:inline">
                                Saving...
                              </span>
                              <span className="sm:hidden">...</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded[u.id] && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 p-0">
                            <InlineAssignments
                              user={u}
                              onChanged={async () => {
                                await loadEffective(u.id);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

function InlineAssignments({
  user,
  onChanged,
}: {
  user: ProfileRow;
  onChanged: () => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await listUserAssignments(user.id);
        setData(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  async function refresh() {
    const rows = await listUserAssignments(user.id);
    setData(rows);
    await onChanged();
  }

  const admins = data.filter(
    (d) => d.kind === "admin" && d.status === "active"
  );
  const reviewers = data.filter(
    (d) => d.kind === "reviewer" && d.status === "active"
  );
  const cms = data.filter(
    (d) => d.kind === "coalition_manager" && d.status === "active"
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 grid md:grid-cols-3 gap-6">
      <AdminBlock
        userId={user.id}
        rows={admins}
        onChange={refresh}
        bumpIfNeeded={user.role === "applicant"}
      />
      <ReviewerBlock
        userId={user.id}
        rows={reviewers}
        onChange={refresh}
        bumpIfNeeded={user.role === "applicant"}
      />
      <CoalitionBlock
        userId={user.id}
        rows={cms}
        onChange={refresh}
        bumpIfNeeded={user.role === "applicant"}
      />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b font-semibold">{title}</div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function RowItem({
  name,
  meta,
  onRevoke,
}: {
  name: string;
  meta: string;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-500">{meta}</div>
      </div>
      <button
        onClick={onRevoke}
        className="text-red-600 text-sm hover:underline"
      >
        Revoke
      </button>
    </div>
  );
}

function AdminBlock({
  userId,
  rows,
  onChange,
  bumpIfNeeded,
}: {
  userId: string;
  rows: any[];
  onChange: () => void;
  bumpIfNeeded: boolean;
}) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    listAllOrgs().then(setOrgs);
  }, []);

  async function add() {
    if (!orgId) return;
    await upsertOrgAdmin(orgId, userId, "active");
    if (bumpIfNeeded) await updateUserRoleV2(userId, "admin", false, "all");
    setOrgId("");
    await onChange();
  }
  async function revoke(scopeId: string) {
    await upsertOrgAdmin(scopeId, userId, "revoked");
    await onChange();
  }

  return (
    <Card title="Org Admin">
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">No org admin assignments.</div>
      )}
      {rows.map((r) => (
        <RowItem
          key={r.scope_id}
          name={r.org_name || r.scope_name}
          meta={`${r.scope_type} • ${r.status}`}
          onRevoke={() => revoke(r.scope_id)}
        />
      ))}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="border rounded px-2 py-1 flex-1 min-w-0"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        >
          <option value="">Select organization…</option>
          {orgs.map((o: any) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="bg-blue-600 text-white px-3 py-1 rounded flex-shrink-0 w-full sm:w-auto"
        >
          Add
        </button>
      </div>
    </Card>
  );
}

function ReviewerBlock({
  userId,
  rows,
  onChange,
  bumpIfNeeded,
}: {
  userId: string;
  rows: any[];
  onChange: () => void;
  bumpIfNeeded: boolean;
}) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [scopeType, setScopeType] = useState<"org" | "program">("org");
  const [orgId, setOrgId] = useState("");
  const [programs, setPrograms] = useState<any[]>([]);
  const [programId, setProgramId] = useState("");

  useEffect(() => {
    listAllOrgs().then(setOrgs);
  }, []);
  useEffect(() => {
    if (scopeType === "program" && orgId)
      listProgramsByOrg(orgId).then(setPrograms);
    else setPrograms([]);
  }, [scopeType, orgId]);

  async function add() {
    if (scopeType === "org" && orgId) {
      await upsertReviewer("org", orgId, userId, "active");
    } else if (scopeType === "program" && programId) {
      await upsertReviewer("program", programId, userId, "active");
    } else {
      return;
    }
    if (bumpIfNeeded) await updateUserRoleV2(userId, "reviewer", false, "all");
    setOrgId("");
    setProgramId("");
    await onChange();
  }
  async function revoke(scopeType: "org" | "program", scopeId: string) {
    await upsertReviewer(scopeType, scopeId, userId, "revoked");
    await onChange();
  }

  return (
    <Card title="Reviewer">
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">No reviewer assignments.</div>
      )}
      {rows.map((r) => (
        <RowItem
          key={`${r.scope_type}:${r.scope_id}`}
          name={r.scope_name}
          meta={`${r.scope_type} • ${r.status}`}
          onRevoke={() => revoke(r.scope_type, r.scope_id)}
        />
      ))}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="border rounded px-2 py-1 flex-shrink-0 w-full sm:w-auto"
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as any)}
          >
            <option value="org">Org</option>
            <option value="program">Program</option>
          </select>

          {scopeType === "org" ? (
            <select
              className="border rounded px-2 py-1 flex-1 min-w-0"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">Select organization…</option>
              {orgs.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <select
                className="border rounded px-2 py-1 flex-1 min-w-0"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">Org…</option>
                {orgs.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-2 py-1 flex-1 min-w-0"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                disabled={!orgId}
              >
                <option value="">Program…</option>
                {programs.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={add}
          className="bg-blue-600 text-white px-3 py-1 rounded w-full sm:w-auto"
        >
          Add
        </button>
      </div>
    </Card>
  );
}

function CoalitionBlock({
  userId,
  rows,
  onChange,
  bumpIfNeeded,
}: {
  userId: string;
  rows: any[];
  onChange: () => void;
  bumpIfNeeded: boolean;
}) {
  const [cos, setCos] = useState<any[]>([]);
  const [coalitionId, setCoalitionId] = useState("");

  useEffect(() => {
    listAllCoalitions().then(setCos);
  }, []);

  async function add() {
    if (!coalitionId) return;
    await upsertCoalitionManager(coalitionId, userId, "active");
    if (bumpIfNeeded)
      await updateUserRoleV2(userId, "coalition_manager", false, "all");
    setCoalitionId("");
    await onChange();
  }
  async function revoke(id: string) {
    await upsertCoalitionManager(id, userId, "revoked");
    await onChange();
  }

  return (
    <Card title="Coalition Manager">
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">
          No coalition manager assignments.
        </div>
      )}
      {rows.map((r) => (
        <RowItem
          key={r.coalition_id}
          name={r.coalition_name}
          meta={`${r.status}`}
          onRevoke={() => revoke(r.coalition_id)}
        />
      ))}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="border rounded px-2 py-1 flex-1 min-w-0"
          value={coalitionId}
          onChange={(e) => setCoalitionId(e.target.value)}
        >
          <option value="">Select coalition…</option>
          {cos.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="bg-blue-600 text-white px-3 py-1 rounded flex-shrink-0 w-full sm:w-auto"
        >
          Add
        </button>
      </div>
    </Card>
  );
}
