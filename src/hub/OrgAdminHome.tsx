import { Link } from "react-router-dom";
import HubTile from "../components/HubTile";

export default function OrgAdminHome() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Admin</h1>
          <p className="text-gray-600 mt-1">
            Create programs, manage reviewers, and oversee applications for your
            organization.
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
  );
}
