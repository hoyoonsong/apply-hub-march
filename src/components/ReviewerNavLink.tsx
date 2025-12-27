import { Link } from "react-router-dom";
import { hasReviewerAssignments } from "../lib/capabilities";
import { useCapabilitiesContext } from "../providers/CapabilitiesProvider";

export default function ReviewerNavLink() {
  const { capabilities, loading } = useCapabilitiesContext();

  if (loading) return null;
  if (!hasReviewerAssignments(capabilities)) return null;

  return (
    <Link
      to="/review"
      className="rounded-md border border-gray-300 px-2 md:px-3 py-1 md:py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm text-xs md:text-sm"
    >
      Reviews
    </Link>
  );
}
