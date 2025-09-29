import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <Link to="/" className="flex items-center">
          <img
            src="/Omnipply.png"
            alt="Omnipply Logo"
            className="h-20 w-auto"
          />
        </Link>
      </div>

      {/* 404 Content */}
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved, deleted, or you entered the wrong URL.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
          >
            Go to Dashboard
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              Go to Dashboard
            </Link>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Need help? Check out our:</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/" className="text-blue-600 hover:text-blue-700">
              Home
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="text-blue-600 hover:text-blue-700"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
