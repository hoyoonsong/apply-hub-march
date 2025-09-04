import { Link } from "react-router-dom";
import HubTile from "../components/HubTile";

export default function CoalitionManagerHome() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coalition Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage your coalition's organizations, programs, and reviewers.
          </p>
        </div>
        <Link
          to="/hub"
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Back to Hub
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HubTile
          title="Create Coalition Program"
          subtitle="Start a new coalition-run audition/scholarship"
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
  );
}
