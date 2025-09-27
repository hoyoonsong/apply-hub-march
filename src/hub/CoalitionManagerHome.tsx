import { Link } from "react-router-dom";
import HubTile from "../components/HubTile";

export default function CoalitionManagerHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Coalition Manager
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your coalition's organizations, programs, and reviewers.
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
          <HubTile
            title="Create Coalition Program"
            subtitle="Start a new coalition-run program"
          />
          <HubTile
            title="Manage Coalition Reviewers"
            subtitle="Assign/remove reviewers for coalition programs"
          />
          <HubTile
            title="Member Organizations"
            subtitle="Add/remove orgs in this coalition"
          />
          <HubTile
            title="Applications Inbox"
            subtitle="View submitted applications"
          />
          <HubTile title="Published Programs" subtitle="See what's live" />
          <HubTile
            title="Coalition Settings"
            subtitle="Name, slug, description"
          />
        </div>
      </div>
    </div>
  );
}
