import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HubTile from "../components/HubTile";
import { assignOrgAdminAsReviewer } from "../lib/orgAdminReviewers";
import { supabase } from "../lib/supabase";
import { getOrgBySlug } from "../lib/orgs";
import AdvertiseFormModal from "../components/AdvertiseFormModal";

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
        await assignOrgAdminAsReviewer(org.id, user.id);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to={`/org/${orgSlug}/admin/programs`} className="block">
            <HubTile
              title="Programs"
              subtitle="Create, edit, and manage programs"
              disabled={false}
              onClick={() => {}}
            />
          </Link>
          <Link to={`/org/${orgSlug}/admin/teams`} className="block">
            <HubTile
              title="My Teams"
              subtitle="Manage team members and their roles"
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
          <button
            type="button"
            onClick={() => {
              if (!orgId) return;
              setShowAdvertiseModal(true);
            }}
            className="w-full text-left rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition"
          >
            <div className="text-lg font-semibold text-gray-900">
              Advertise your org
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Request a featured placement and tell us how long to run it.
            </p>
          </button>
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
