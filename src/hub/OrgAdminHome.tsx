import { Link } from "react-router-dom";
import HubTile from "../components/HubTile";

export default function OrgAdminHome() {
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
              to="/hub"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HubTile title="Create Program" subtitle="Auditions & scholarships" />
          <HubTile
            title="Manage Reviewers"
            subtitle="Assign reviewers to org/program scopes"
          />
          <HubTile
            title="Applications Inbox"
            subtitle="Review and change statuses"
          />
          <HubTile
            title="Published Programs"
            subtitle="Quick overview of what's live"
          />
          <HubTile title="Team (Org Admins)" subtitle="Add/remove org admins" />
          <HubTile
            title="Organization Settings"
            subtitle="Name, slug, description"
          />
        </div>
      </div>
    </div>
  );
}
