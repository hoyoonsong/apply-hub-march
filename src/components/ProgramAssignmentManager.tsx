import React, { useState, useEffect } from "react";
import {
  findUserByEmail,
  addProgramReviewer,
  addProgramAdmin,
  removeProgramReviewer,
  removeProgramAdmin,
  listProgramAssignments,
  ProgramAssignments,
  ProgramAssignment,
} from "../lib/programAssignments";

interface ProgramAssignmentManagerProps {
  programId: string;
  programName: string;
}

export default function ProgramAssignmentManager({
  programId,
  programName,
}: ProgramAssignmentManagerProps) {
  const [assignments, setAssignments] = useState<ProgramAssignments>({
    reviewers: [],
    admins: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormType, setAddFormType] = useState<"reviewer" | "admin">(
    "reviewer"
  );
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  useEffect(() => {
    loadAssignments();
  }, [programId]);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError(null);
      const data = await listProgramAssignments(programId);
      // Ensure we always have valid arrays
      setAssignments({
        reviewers: data?.reviewers || [],
        admins: data?.admins || [],
      });
    } catch (err: any) {
      console.error(
        "ProgramAssignmentManager - Error loading assignments:",
        err
      );
      setError(err.message);
      // Set empty assignments on error
      setAssignments({ reviewers: [], admins: [] });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!userEmail.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      // First, lookup the user
      const user = await findUserByEmail(userEmail.trim());

      if (!user) {
        setError("User not found. They need to sign up first.");
        return;
      }

      // Validate name match if name is provided
      if (
        userName.trim() &&
        user.full_name &&
        userName.trim() !== user.full_name
      ) {
        setError(
          "Name doesn't match the user's profile. Please use the correct name or leave empty."
        );
        return;
      }

      // Set the found user data
      setFoundUser(user);
      setUserName(user.full_name || "");

      // Then add the user (use the found user's name, not the entered name)
      const result =
        addFormType === "reviewer"
          ? await addProgramReviewer(
              programId,
              userEmail.trim(),
              user.full_name || undefined
            )
          : await addProgramAdmin(
              programId,
              userEmail.trim(),
              user.full_name || undefined
            );

      if (result.success) {
        setSuccess(
          `${
            addFormType === "reviewer" ? "Reviewer" : "Admin"
          } added successfully!`
        );
        closeAddForm();
        await loadAssignments();
      } else {
        setError(result.error || "Failed to add user");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveUser(type: "reviewer" | "admin", email: string) {
    if (!confirm(`Remove this ${type}?`)) return;

    try {
      setError(null);
      const result =
        type === "reviewer"
          ? await removeProgramReviewer(programId, email)
          : await removeProgramAdmin(programId, email);

      if (result.success) {
        setSuccess(
          `${type === "reviewer" ? "Reviewer" : "Admin"} removed successfully!`
        );
        await loadAssignments();
      } else {
        setError(result.error || "Failed to remove user");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetAddForm() {
    setUserEmail("");
    setUserName("");
    setFoundUser(null);
    setError(null);
  }

  function closeAddForm() {
    setShowAddForm(false);
    resetAddForm();
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Program Assignments - {programName}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAddFormType("reviewer");
              setShowAddForm(true);
              resetAddForm();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
          >
            Add Reviewer
          </button>
          <button
            onClick={() => {
              setAddFormType("admin");
              setShowAddForm(true);
              resetAddForm();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Add Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">
            Add {addFormType === "reviewer" ? "Reviewer" : "Admin"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="John Doe"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {foundUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 text-sm">
                <strong>Found user:</strong> {foundUser.full_name || "No name"}{" "}
                ({foundUser.email})
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddUser}
              disabled={!userEmail.trim() || isAdding}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isAdding
                ? "Adding..."
                : `Add ${addFormType === "reviewer" ? "Reviewer" : "Admin"}`}
            </button>
            <button
              onClick={closeAddForm}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviewers List */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">
          Reviewers ({assignments.reviewers?.length || 0})
        </h4>
        {!assignments.reviewers || assignments.reviewers.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviewers assigned</p>
        ) : (
          <div className="space-y-2">
            {assignments.reviewers.map((reviewer) => (
              <div
                key={reviewer.user_id}
                className="flex items-center justify-between bg-gray-50 rounded-md p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {reviewer.full_name || "No name"}
                  </p>
                  <p className="text-sm text-gray-600">{reviewer.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveUser("reviewer", reviewer.email)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admins List */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">
          Admins ({assignments.admins?.length || 0})
        </h4>
        {!assignments.admins || assignments.admins.length === 0 ? (
          <p className="text-gray-500 text-sm">No admins assigned</p>
        ) : (
          <div className="space-y-2">
            {assignments.admins.map((admin) => (
              <div
                key={admin.user_id}
                className="flex items-center justify-between bg-gray-50 rounded-md p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {admin.full_name || "No name"}
                  </p>
                  <p className="text-sm text-gray-600">{admin.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveUser("admin", admin.email)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
