import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function OrgTeamManagement() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userData.user.id)
          .single();

        if (profileData) {
          setCurrentUser({
            user_id: userData.user.id,
            email: profileData.email,
            full_name: profileData.full_name,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                Team Management
              </h1>
              <Link
                to={`/org/${orgSlug}/admin`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Team Management
              </h1>
              <p className="text-gray-600 mt-2">
                Organization administrator information
              </p>
            </div>
            <Link
              to={`/org/${orgSlug}/admin`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Organization Admin Access
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              As an organization administrator, you can manage program reviewers
              and application settings. To add or remove other organization
              administrators, please contact a super administrator.
            </p>
            <div className="flex gap-4">
              <Link
                to={`/org/${orgSlug}/admin/reviewers`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Manage Program Reviewers
              </Link>
              <Link
                to={`/org/${orgSlug}/admin/programs`}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Manage Programs
              </Link>
            </div>
          </div>

          {currentUser && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Current Administrator
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {currentUser.full_name || "No name"}
                  </p>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                  Active
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
