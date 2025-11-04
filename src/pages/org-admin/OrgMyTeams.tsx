import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { findUserByEmail } from "../../lib/programAssignments";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: "active" | "revoked";
  assignments: {
    org_admin: boolean;
    reviewer_programs: string[];
    reviewer_org: boolean;
  };
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function OrgMyTeams() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "reviewer">(
    "reviewer"
  );
  const [isAdding, setIsAdding] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const [programs, setPrograms] = useState<any[]>([]);
  const [programSearchTerm, setProgramSearchTerm] = useState("");

  useEffect(() => {
    if (orgSlug) {
      loadOrganization();
    }
  }, [orgSlug]);

  useEffect(() => {
    if (org) {
      loadTeamMembers();
    }
  }, [org]);

  async function loadOrganization() {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("slug", orgSlug)
        .single();

      if (error) throw error;
      setOrg(data);
    } catch (err: any) {
      console.error("Error loading organization:", err);
      setError("Failed to load organization");
    }
  }

  async function loadTeamMembers() {
    if (!org) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load organization-level admins using RPC function (bypasses RLS)
      let orgAdmins: any[] = [];
      
      const { data: orgAdminsData, error: adminsError } = await supabase.rpc(
        "org_list_org_admins",
        { p_org_id: org.id }
      );

      if (adminsError) {
        console.error("Error calling org_list_org_admins:", adminsError);
        // If RPC function doesn't exist or fails, try to continue with empty array
        // This allows the page to still load reviewers from programs
        console.warn("Continuing without org admins data");
        orgAdmins = [];
      } else {
        // Convert RPC result to expected format
        orgAdmins = Array.isArray(orgAdminsData) 
          ? orgAdminsData.map((admin: any) => ({
              user_id: admin.user_id,
              status: admin.status,
              created_at: admin.created_at,
              email: admin.email,
              full_name: admin.full_name,
            }))
          : [];
      }

      // Get all programs for this organization using RPC function (bypasses RLS)
      let programs: any[] = [];
      
      const { data: programsData, error: programsError } = await supabase.rpc(
        "org_list_org_programs",
        { p_org_id: org.id }
      );

      if (programsError) {
        console.error("Error calling org_list_org_programs:", programsError);
        // If RPC function doesn't exist or fails, we can't load team members properly
        throw new Error(`Failed to load programs: ${programsError.message}`);
      }
      
      // Convert RPC result to expected format
      programs = Array.isArray(programsData)
        ? programsData.map((p: any) => ({
            id: p.id,
            name: p.name,
          }))
        : [];
      
      setPrograms(programs);

      // Get all reviewers for all programs in this organization
      const allReviewers = new Map<string, TeamMember>();

      // Add org admins first
      orgAdmins?.forEach((admin: any) => {
        allReviewers.set(admin.user_id, {
          id: admin.user_id,
          email: admin.email || "Loading...", // Use email from RPC if available
          full_name: admin.full_name || "Loading...", // Use name from RPC if available
          role: "admin",
          status: admin.status === "active" ? "active" : "revoked",
          assignments: {
            org_admin: true,
            reviewer_programs: [],
            reviewer_org: true,
          },
          created_at: admin.created_at,
        });
      });

      // Load org-level reviewers (reviewers assigned to the org, not specific programs)
      try {
        const { data: orgReviewersData, error: orgReviewersError } = await supabase.rpc(
          "org_list_org_reviewers",
          { p_org_id: org.id }
        );

        if (!orgReviewersError && orgReviewersData) {
          const orgReviewers = Array.isArray(orgReviewersData) ? orgReviewersData : [];
          
          orgReviewers.forEach((reviewer: any) => {
            if (!allReviewers.has(reviewer.user_id)) {
              allReviewers.set(reviewer.user_id, {
                id: reviewer.user_id,
                email: reviewer.email || "Loading...",
                full_name: reviewer.full_name || "Loading...",
                role: "reviewer",
                status: reviewer.status === "active" ? "active" : "revoked",
                assignments: {
                  org_admin: false,
                  reviewer_programs: [],
                  reviewer_org: true,
                },
                created_at: reviewer.created_at,
              });
            } else {
              // Update existing member to mark as org reviewer
              const existing = allReviewers.get(reviewer.user_id)!;
              existing.assignments.reviewer_org = true;
            }
          });
        }
      } catch (err) {
        console.warn("Failed to load org-level reviewers:", err);
      }

      for (const program of programs || []) {
        try {
          const { data: assignments, error: assignmentsError } = await supabase.rpc(
            "org_list_program_assignments",
            {
              p_program_id: program.id,
            }
          );

          if (assignmentsError) {
            console.warn(`Error loading assignments for program ${program.id}:`, assignmentsError);
            continue;
          }

          if (assignments?.reviewers) {
            assignments.reviewers.forEach((reviewer: any) => {
              if (!allReviewers.has(reviewer.user_id)) {
                // Check if this user is an org admin
                const isAdmin = orgAdmins?.some(
                  (admin: any) => admin.user_id === reviewer.user_id
                );
                allReviewers.set(reviewer.user_id, {
                  id: reviewer.user_id,
                  email: reviewer.email,
                  full_name: reviewer.full_name,
                  role: isAdmin ? "admin" : "reviewer",
                  status: reviewer.status === "active" ? "active" : "revoked",
                  assignments: {
                    org_admin: isAdmin || false,
                    reviewer_programs: [program.id],
                    reviewer_org: isAdmin || false,
                  },
                  created_at: reviewer.created_at,
                });
              } else {
                // Add this program to their assignments and fill in email/name if needed
                const existing = allReviewers.get(reviewer.user_id)!;
                if (!existing.assignments.reviewer_programs.includes(program.id)) {
                  existing.assignments.reviewer_programs.push(program.id);
                }
                if (existing.email === "Loading..." && reviewer.email) {
                  existing.email = reviewer.email;
                  existing.full_name = reviewer.full_name;
                }
                // If this reviewer is active in this program, mark them as active overall
                // (user is active if they're active in ANY program)
                if (reviewer.status === "active") {
                  existing.status = "active";
                }
              }
            });
          }

          if (assignments?.admins) {
            assignments.admins.forEach((admin: any) => {
              if (!allReviewers.has(admin.user_id)) {
                allReviewers.set(admin.user_id, {
                  id: admin.user_id,
                  email: admin.email,
                  full_name: admin.full_name,
                  role: "admin",
                  status: admin.status === "active" ? "active" : "revoked",
                  assignments: {
                    org_admin: true,
                    reviewer_programs: [program.id],
                    reviewer_org: true,
                  },
                  created_at: admin.created_at,
                });
              } else {
                // Update existing member to admin if they're an admin
                const existing = allReviewers.get(admin.user_id)!;
                existing.role = "admin";
                existing.assignments.org_admin = true;
                existing.assignments.reviewer_org = true;
                if (
                  !existing.assignments.reviewer_programs.includes(program.id)
                ) {
                  existing.assignments.reviewer_programs.push(program.id);
                }
                // If this admin is active in this program, mark them as active overall
                if (admin.status === "active") {
                  existing.status = "active";
                }
              }
            });
          }
        } catch (err) {
          console.warn(
            `Failed to load assignments for program ${program.id}:`,
            err
          );
        }
      }

      // Filter: show members who are active in at least one program/org
      // Also check if they have any program assignments (active reviewers/admins)
      const teamMembersArray = Array.from(allReviewers.values())
        .filter((member) => {
          // Show if status is active
          if (member.status === "active") return true;
          // Also show if they have program assignments (they might be active in some programs)
          if (member.assignments.reviewer_programs.length > 0) return true;
          // Show org admins and org reviewers
          if (member.assignments.org_admin || member.assignments.reviewer_org) return true;
          return false;
        });
      
      console.log(
        "All reviewers before filtering:",
        Array.from(allReviewers.values()).map(m => ({ id: m.id, email: m.email, status: m.status }))
      );
      console.log(
        "Final team members array:",
        teamMembersArray.map(m => ({ id: m.id, email: m.email, status: m.status })),
        "at",
        new Date().toISOString()
      );
      setTeamMembers(teamMembersArray);
    } catch (err: any) {
      console.error("Error loading team members:", err);
      setError("Failed to load team members");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  }

  async function handleAddMember() {
    if (!newMemberEmail.trim() || !org) return;

    setIsAdding(true);
    setError(null);

    try {
      // Find user by email using the working function
      const user = await findUserByEmail(newMemberEmail);
      console.log("Found user:", user);
      if (!user) {
        setError("User not found. Please make sure they have an account.");
        return;
      }

      if (!user.user_id) {
        setError("User found but missing ID. Please try again.");
        return;
      }

      setFoundUser(user);

      // Get all programs for this organization
      const { data: programs, error: programsError } = await supabase
        .from("programs")
        .select("id")
        .eq("organization_id", org.id)
        .is("deleted_at", null);

      if (programsError) throw programsError;

      if (newMemberRole === "admin") {
        // Add as organization admin using RPC function (bypasses RLS)
        const { data: adminResult, error: adminError } = await supabase.rpc(
          "org_add_org_admin",
          {
            p_org_id: org.id,
            p_user_email: user.email,
            p_user_name: user.full_name || null,
          }
        );
        if (adminError) throw adminError;
        if (adminResult && !adminResult.success) {
          throw new Error(adminResult.error || "Failed to add org admin");
        }

        // Also add as program admin to ALL programs in the organization
        let addedCount = 0;
        for (const program of programs || []) {
          const { data: result, error } = await supabase.rpc("org_add_program_admin", {
            p_program_id: program.id,
            p_user_email: user.email,
            p_user_name: user.full_name || null,
          });
          if (error) {
            console.warn(
              `Failed to add admin to program ${program.id}:`,
              error
            );
            // Continue with other programs even if one fails
          } else if (result?.success) {
            addedCount++;
            console.log(`Successfully added admin to program ${program.id}:`, result);
          }
        }
        console.log(`Added admin to ${addedCount} out of ${programs?.length || 0} programs`);
      }

      // Add as reviewer to ALL programs in the organization (both admins and reviewers)
      // Note: Admins are also added as reviewers so they can review applications
      let addedCount = 0;
      for (const program of programs || []) {
        const { data: result, error } = await supabase.rpc("org_add_program_reviewer", {
          p_program_id: program.id,
          p_user_email: user.email,
          p_user_name: user.full_name || null,
        });
        if (error) {
          console.warn(
            `Failed to add reviewer to program ${program.id}:`,
            error
          );
          // Continue with other programs even if one fails
        } else if (result?.success) {
          addedCount++;
          console.log(`Successfully added reviewer to program ${program.id}:`, result);
        }
      }

      console.log(`Added reviewer to ${addedCount} out of ${programs?.length || 0} programs`);

      setSuccess(
        `${user.full_name || user.email} added to your team as ${newMemberRole}`
      );
      setNewMemberEmail("");
      setNewMemberName("");
      setFoundUser(null);
      setShowAddForm(false);

      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload the team list
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Error adding team member:", err);
      setError(err.message || "Failed to add team member");
    } finally {
      setIsAdding(false);
    }
  }

  // Toggle expanded state for team member
  function toggleExpanded(memberId: string) {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  }

  // Add member to program
  async function addMemberToProgram(memberId: string, programId: string) {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;

    try {
      const { error } = await supabase.rpc("org_add_program_reviewer", {
        p_program_id: programId,
        p_user_email: member.email,
        p_user_name: member.full_name || null,
      });
      if (error) throw error;

      setSuccess(`${member.full_name || member.email} added to program`);
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Error adding member to program:", err);
      setError(err.message || "Failed to add member to program");
    }
  }

  // Remove member from program
  async function removeMemberFromProgram(memberId: string, programId: string) {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;

    try {
      const { error } = await supabase.rpc("org_remove_program_reviewer", {
        p_program_id: programId,
        p_user_email: member.email,
      });
      if (error) throw error;

      setSuccess(`${member.full_name || member.email} removed from program`);
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Error removing member from program:", err);
      setError(err.message || "Failed to remove member from program");
    }
  }

  async function removeTeamMember(userId: string, role: string) {
    if (!org) return;

    try {
      // Get the user's email for removal
      const user = await findUserByEmail(
        teamMembers.find((m) => m.id === userId)?.email || ""
      );
      if (!user) throw new Error("User not found");

      // Get all programs for this organization
      const { data: programs, error: programsError } = await supabase
        .from("programs")
        .select("id")
        .eq("organization_id", org.id)
        .is("deleted_at", null);

      if (programsError) throw programsError;

      if (role === "admin") {
        // Remove from organization admins using RPC function (bypasses RLS)
        const { data: removeResult, error: removeError } = await supabase.rpc(
          "org_remove_org_admin",
          {
            p_org_id: org.id,
            p_user_email: user.email,
          }
        );
        if (removeError) throw removeError;
        if (removeResult && !removeResult.success) {
          throw new Error(removeResult.error || "Failed to remove org admin");
        }

        // Also remove as program admin from all programs
        for (const program of programs || []) {
          const { error } = await supabase.rpc("org_remove_program_admin", {
            p_program_id: program.id,
            p_user_email: user.email,
          });
          if (error) {
            console.warn(
              `Failed to remove admin from program ${program.id}:`,
              error
            );
            // Continue with other programs even if one fails
          }
        }
      }

      // Remove as reviewer from ALL programs in the organization (both admins and reviewers)
      for (const program of programs || []) {
        const { error } = await supabase.rpc("org_remove_program_reviewer", {
          p_program_id: program.id,
          p_user_email: user.email,
        });
        if (error) {
          console.warn(
            `Failed to remove reviewer from program ${program.id}:`,
            error
          );
          // Continue with other programs even if one fails
        }
      }

      setSuccess("Team member removed successfully");
      // Reload the team list
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Error removing team member:", err);
      setError(err.message || "Failed to remove team member");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading team members...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
              <p className="mt-1 text-gray-600">
                Build your team of reviewers and admins for {org?.name}. Add
                people here so you can easily assign them to programs.
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Add Team Member Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="px-8 py-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></div>
              <h2 className="text-xl font-bold text-gray-900">
                Add Team Member
              </h2>
            </div>
          </div>

          <div className="p-8">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Team Member
              </button>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      placeholder="user@example.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Role
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={newMemberRole}
                      onChange={(e) =>
                        setNewMemberRole(e.target.value as "admin" | "reviewer")
                      }
                    >
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {foundUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {foundUser.full_name?.charAt(0) ||
                            foundUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">
                          {foundUser.full_name || "No name provided"}
                        </p>
                        <p className="text-sm text-blue-700">
                          {foundUser.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleAddMember}
                    disabled={!newMemberEmail.trim() || isAdding}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isAdding ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Adding...
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Add to Team
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewMemberEmail("");
                      setNewMemberName("");
                      setFoundUser(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No team members yet
              </h3>
              <p className="text-gray-500 mb-4">
                Add team members to get started with managing your organization.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add First Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-900">
                      Member
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-900">
                      Assignments
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamMembers.map((member) => (
                    <>
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpanded(member.id)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <button
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(member.id);
                              }}
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${
                                  expandedMembers.has(member.id)
                                    ? "rotate-90"
                                    : ""
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
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {member.full_name?.charAt(0) ||
                                  member.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.full_name || "No name provided"}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              member.role === "admin"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {member.role === "admin" ? "Admin" : "Reviewer"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                            {member.assignments.reviewer_programs.length}{" "}
                            Program
                            {member.assignments.reviewer_programs.length !== 1
                              ? "s"
                              : ""}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              member.status === "active"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {member.status === "active" ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {member.id !== user?.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTeamMember(member.id, member.role);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-150"
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
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedMembers.has(member.id) && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <div className="bg-gray-50 border-t border-gray-200">
                              <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Current Program Assignments */}
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900">
                                        Current Program Assignments
                                      </h4>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {
                                          member.assignments.reviewer_programs
                                            .length
                                        }{" "}
                                        programs
                                      </span>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {member.assignments.reviewer_programs
                                        .length > 0 ? (
                                        member.assignments.reviewer_programs.map(
                                          (programId) => {
                                            const program = programs.find(
                                              (p) => p.id === programId
                                            );
                                            return program ? (
                                              <div
                                                key={programId}
                                                className="group flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all duration-200"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                      {program.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                      Active assignment
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={() =>
                                                    removeMemberFromProgram(
                                                      member.id,
                                                      programId
                                                    )
                                                  }
                                                  className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            ) : null;
                                          }
                                        )
                                      ) : (
                                        <div className="text-center py-8">
                                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg
                                              className="w-6 h-6 text-gray-400"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                              />
                                            </svg>
                                          </div>
                                          <p className="text-sm text-gray-500">
                                            No program assignments
                                          </p>
                                          <p className="text-xs text-gray-400 mt-1">
                                            Add programs from the right panel
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Add to Programs */}
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900">
                                        Add to Programs
                                      </h4>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {
                                          programs.filter(
                                            (p) =>
                                              !member.assignments.reviewer_programs.includes(
                                                p.id
                                              )
                                          ).length
                                        }{" "}
                                        available
                                      </span>
                                    </div>
                                    <div className="mb-4">
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
                                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                          value={programSearchTerm}
                                          onChange={(e) =>
                                            setProgramSearchTerm(e.target.value)
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {programs
                                        .filter(
                                          (program) =>
                                            !member.assignments.reviewer_programs.includes(
                                              program.id
                                            ) &&
                                            program.name
                                              .toLowerCase()
                                              .includes(
                                                programSearchTerm.toLowerCase()
                                              )
                                        )
                                        .map((program) => (
                                          <div
                                            key={program.id}
                                            className="group flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                              <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                  {program.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                  Available to assign
                                                </p>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() =>
                                                addMemberToProgram(
                                                  member.id,
                                                  program.id
                                                )
                                              }
                                              className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                                            >
                                              Add
                                            </button>
                                          </div>
                                        ))}
                                      {programs.filter(
                                        (program) =>
                                          !member.assignments.reviewer_programs.includes(
                                            program.id
                                          ) &&
                                          program.name
                                            .toLowerCase()
                                            .includes(
                                              programSearchTerm.toLowerCase()
                                            )
                                      ).length === 0 && (
                                        <div className="text-center py-8">
                                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg
                                              className="w-6 h-6 text-gray-400"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                              />
                                            </svg>
                                          </div>
                                          <p className="text-sm text-gray-500">
                                            {programSearchTerm
                                              ? "No programs match your search"
                                              : "Member is assigned to all programs"}
                                          </p>
                                          {programSearchTerm && (
                                            <p className="text-xs text-gray-400 mt-1">
                                              Try a different search term
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
