import React from "react";
import { Link } from "react-router-dom";
import ReviewerNavLink from "./ReviewerNavLink";

export default function DashboardNavigation() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 md:px-6 py-3 md:py-3">
      <div className="flex flex-wrap items-center gap-3 md:gap-3 text-xs md:text-sm">
        <span className="text-blue-600 font-semibold hidden sm:inline">
          Quick Access:
        </span>
        <span className="text-blue-600 font-semibold sm:hidden">Menu:</span>

        <Link
          to="/"
          className="rounded-md border border-gray-300 px-3 md:px-3 py-2 md:py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm text-xs md:text-sm"
        >
          Home
        </Link>

        <Link
          to="/dashboard"
          className="rounded-md border border-gray-300 px-3 md:px-3 py-2 md:py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm text-xs md:text-sm"
        >
          Dashboard
        </Link>

        <Link
          to="/profile"
          className="rounded-md border border-gray-300 px-3 md:px-3 py-2 md:py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm text-xs md:text-sm"
        >
          Profile
        </Link>

        <Link
          to="/my-submissions"
          className="rounded-md border border-gray-300 px-3 md:px-3 py-2 md:py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm text-xs md:text-sm"
        >
          My Submissions
        </Link>

        <ReviewerNavLink />
      </div>
    </div>
  );
}
