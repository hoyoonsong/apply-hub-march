import React from "react";
import { Link } from "react-router-dom";
import ReviewerNavLink from "./ReviewerNavLink";

export default function DashboardNavigation() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-blue-600 font-semibold">Quick Access:</span>

        <Link
          to="/"
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm"
        >
          Home
        </Link>

        <Link
          to="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm"
        >
          Dashboard
        </Link>

        <ReviewerNavLink />
      </div>
    </div>
  );
}
