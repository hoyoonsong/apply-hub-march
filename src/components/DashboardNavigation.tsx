import { Link, useLocation } from "react-router-dom";
import ReviewerNavLink from "./ReviewerNavLink";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";

export default function DashboardNavigation() {
  const { hasUnread } = useUnreadNotifications();
  const location = useLocation();

  const isActive = (path: string) => {
    const normalizedCurrent = location.pathname.replace(/\/$/, "");
    const normalizedPath = path.replace(/\/$/, "");
    return normalizedCurrent === normalizedPath;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isActive("/")
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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>Home</span>
        </Link>

        <Link
          to="/profile"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isActive("/profile")
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Profile</span>
        </Link>

        <Link
          to="/my-submissions"
          className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isActive("/my-submissions")
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>My Submissions</span>
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          )}
        </Link>

        <ReviewerNavLink />
      </div>
    </div>
  );
}
