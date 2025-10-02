import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import HubTile from "../components/HubTile";
import { assignOrgAdminAsReviewer } from "../lib/orgAdminReviewers";
import { supabase } from "../lib/supabase";

export default function OrgAdminHome() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  // Auto-sync org admin reviewers when component mounts
  useEffect(() => {
    const syncReviewers = async () => {
      try {
        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get organization ID from slug
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", orgSlug)
          .single();

        if (org) {
          // Assign current user as reviewer for all programs in this org
          await assignOrgAdminAsReviewer(org.id, user.id);
        }
      } catch (error) {
        console.error("Failed to sync org admin reviewers:", error);
        // Don't show error to user, just log it
      }
    };

    syncReviewers();
  }, [orgSlug]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Organization Admin
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create programs, manage reviewers, and oversee applications for
                your organization.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to={`/org/${orgSlug}/admin/programs`} className="block">
            <HubTile
              title="Programs"
              subtitle="Create, edit, and manage programs"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to={`/org/${orgSlug}/admin/reviewers`} className="block">
            <HubTile
              title="Manage Reviewers"
              subtitle="Assign reviewers to org/program scopes"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to="/review/all" className="block">
            <HubTile
              title="Applications Inbox"
              subtitle="Review and change statuses"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to={`/org/${orgSlug}/admin/publish-results`} className="block">
            <HubTile
              title="Publish Results"
              subtitle="Publish review results to applicants"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <HubTile
            title="Organization Settings"
            subtitle="Name, slug, description"
          />
        </div>
      </div>
    </div>
  );
}
