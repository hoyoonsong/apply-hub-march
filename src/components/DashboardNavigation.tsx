import React from "react";
import { Link } from "react-router-dom";

export default function DashboardNavigation() {
  return (
    <div className="bg-gray-50 border-b px-6 py-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-blue-600 font-medium">Quick Access:</span>

        <Link
          to="/"
          className="rounded-lg border px-3 py-1 hover:bg-gray-100 text-gray-700 transition-colors"
        >
          Home
        </Link>

        <Link
          to="/dashboard"
          className="rounded-lg border px-3 py-1 hover:bg-gray-100 text-gray-700 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
