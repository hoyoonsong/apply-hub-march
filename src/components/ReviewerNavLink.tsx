import { Link, useLocation } from "react-router-dom";
import { hasReviewerAssignments } from "../lib/capabilities";
import { useCapabilitiesContext } from "../providers/CapabilitiesProvider";

export default function ReviewerNavLink() {
  const { capabilities, loading } = useCapabilitiesContext();
  const location = useLocation();

  if (loading) return null;
  if (!hasReviewerAssignments(capabilities)) return null;

  const isActive = location.pathname.startsWith("/review");

  return (
    <Link
      to="/review"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
        isActive
          ? "bg-[#1F3A52]/10 text-[#1F3A52]"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      <span>Reviews</span>
    </Link>
  );
}
