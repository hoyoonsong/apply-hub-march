import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

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

const ROLE_OPTIONS: UserRole[] = [
  "applicant",
  "admin",
  "reviewer",
  "coalition_manager",
  "superadmin",
];

function RoleBadge({ role }: { role: UserRole }) {
  const cls =
    role === "superadmin"
      ? "bg-purple-100 text-purple-800"
      : role === "admin"
      ? "bg-blue-100 text-blue-800"
      : role === "reviewer"
      ? "bg-green-100 text-green-800"
      : role === "coalition_manager"
      ? "bg-orange-100 text-orange-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {role}
    </span>
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
      p_role_filter: roleFilter === "" ? null : roleFilter,
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
  }, [search, roleFilter]);

  // helpers
  function toggleSelectAll(check: boolean) {
    if (!check) {
      setSelected({});
      return;
    }
    const map: Record<string, boolean> = {};
    users.forEach((u) => (map[u.id] = true));
    setSelected(map);
  }

  function setSelectedOne(id: string, check: boolean) {
    setSelected((m) => ({ ...m, [id]: check }));
  }

  async function updateRoleForOne(id: string, newRole: UserRole) {
    setRowBusy((m) => ({ ...m, [id]: true }));
    setBanner(null);

    const prev = users.find((u) => u.id === id);
    setUsers((list) =>
      list.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );

    const { error } = await supabase.rpc("super_update_user_role_v1", {
      p_user_id: id,
      p_new_role: newRole,
    });

    if (error) {
      // revert optimistic change
      setUsers((list) =>
        list.map((u) => (u.id === id && prev ? { ...u, role: prev.role } : u))
      );
      setBanner({ type: "error", msg: error.message });
    } else {
      setBanner({ type: "success", msg: "Role updated." });
    }
    setRowBusy((m) => ({ ...m, [id]: false }));
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Users
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage user roles and permissions
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
        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or user ID..."
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1).replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2 sm:hidden">
                Actions
              </label>
              <button
                onClick={() => fetchUsers()}
                className="w-full sm:w-auto h-10 inline-flex items-center justify-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {Object.values(selected).filter(Boolean).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {Object.values(selected).filter(Boolean).length} selected
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
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        Change to{" "}
                        {r.charAt(0).toUpperCase() +
                          r.slice(1).replace("_", " ")}
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
          )}
        </div>

        {/* Banners */}
        {banner && (
          <Banner
            type={banner.type}
            msg={banner.msg}
            onClose={() => setBanner(null)}
          />
        )}
        {fetchError && <Banner type="error" msg={fetchError} />}

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Users ({users.length})
            </h2>
            {users.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={
                    users.length > 0 && users.every((u) => selected[u.id])
                  }
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="select-all" className="text-sm text-gray-700">
                  Select all
                </label>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading users...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
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
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                      Role
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
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50 ${
                        selected[u.id] ? "bg-blue-50" : ""
                      }`}
                    >
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <RoleBadge role={u.role} />
                          <select
                            value={u.role}
                            disabled={rowBusy[u.id]}
                            onChange={(e) =>
                              updateRoleForOne(u.id, e.target.value as UserRole)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Escape")
                                (e.target as HTMLSelectElement).blur();
                            }}
                            className="w-full sm:w-auto h-8 text-xs sm:text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() +
                                  r.slice(1).replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell w-[140px]">
                        <div>{new Date(u.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(u.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-center w-[100px]">
                        {rowBusy[u.id] ? (
                          <div className="inline-flex items-center text-xs sm:text-sm text-blue-600">
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600 mr-1 sm:mr-2"></div>
                            <span className="hidden sm:inline">Saving...</span>
                            <span className="sm:hidden">...</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs sm:text-sm">
                            —
                          </span>
                        )}
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
