import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HubTile from "../components/HubTile";
import { assignOrgAdminAsReviewer } from "../lib/orgAdminReviewers";
import { supabase } from "../lib/supabase";
import { getOrgBySlug } from "../lib/orgs";
import AdvertiseFormModal from "../components/AdvertiseFormModal";
import { deduplicateRequest, createRpcKey } from "../lib/requestDeduplication";

export default function OrgAdminHome() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [showAdvertiseModal, setShowAdvertiseModal] = useState(false);

  // Auto-sync org admin reviewers when component mounts
  useEffect(() => {
    let mounted = true;
    const syncReviewers = async () => {
      try {
        // Get organization ID from slug
        const org = orgSlug ? await getOrgBySlug(orgSlug) : null;
        if (org && mounted) {
          setOrgId(org.id);
          setOrgName(org.name);
        }

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !org) return;

        // Assign current user as reviewer for all programs in this org
        // Use deduplication to prevent duplicate calls from React StrictMode
        await deduplicateRequest(
          createRpcKey("assign_org_admin_as_reviewer", {
            p_org_id: org.id,
            p_user_id: user.id,
          }),
          () => assignOrgAdminAsReviewer(org.id, user.id)
        );
      } catch (error) {
        console.error("Failed to sync org admin reviewers:", error);
        // Don't show error to user, just log it
      }
    };

    syncReviewers();
    return () => {
      mounted = false;
    };
  }, [orgSlug]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Organization Admin
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create programs, manage reviewers, and oversee applications for
                your organization.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          <Link to={`/org/${orgSlug}/admin/programs`} className="block h-full">
            <HubTile
              title="Programs"
              subtitle="Create, edit, and manage programs"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to={`/org/${orgSlug}/admin/teams`} className="block h-full">
            <HubTile
              title="My Teams"
              subtitle="Manage team members and their roles"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to="/review/all" className="block h-full">
            <HubTile
              title="Applications Inbox"
              subtitle="Review and change statuses"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link
            to={`/org/${orgSlug}/admin/publish-results`}
            className="block h-full"
          >
            <HubTile
              title="Publish Results"
              subtitle="Publish review results to applicants"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <div className="h-full">
            <HubTile
              title="Organization Settings"
              subtitle="Name, slug, description"
            />
          </div>
          <div className="h-full">
            <HubTile
              title="Advertise"
              subtitle="Request a featured placement and tell us how long to run it."
              disabled={!orgId}
              onClick={() => {
                if (!orgId) return;
                setShowAdvertiseModal(true);
              }}
              accent="blue"
            />
          </div>
        </div>
      </div>
      <AdvertiseFormModal
        open={showAdvertiseModal}
        onClose={() => setShowAdvertiseModal(false)}
        orgId={orgId}
        orgName={orgName}
        orgSlug={orgSlug}
      />
    </div>
  );
}
