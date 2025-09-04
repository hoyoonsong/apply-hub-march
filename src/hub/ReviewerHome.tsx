import { Link } from "react-router-dom";
import HubTile from "../components/HubTile";

export default function ReviewerHome() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviewer</h1>
          <p className="text-gray-600 mt-1">
            Access your review queue, completed reviews, and guidelines.
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
          title="My Review Queue"
          subtitle="Applications assigned to you"
        />
        <HubTile
          title="Completed Reviews"
          subtitle="See what you've finished"
        />
        <HubTile
          title="Rubrics / Guidelines"
          subtitle="Scoring instructions & policies"
        />
        <HubTile
          title="Reviewer Profile"
          subtitle="Name, notifications, preferences"
        />
      </div>
    </div>
  );
}
