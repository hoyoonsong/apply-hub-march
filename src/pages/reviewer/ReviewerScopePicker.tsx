import { Link } from "react-router-dom";

export default function ReviewerScopePicker() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reviewer</h1>
            <p className="text-sm text-gray-500">
              Reviewers are now assigned to specific programs, not
              organizations.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="p-6 bg-white rounded-lg border text-center">
          <div className="text-gray-600 mb-4">
            <p className="text-lg mb-2">
              Reviewer assignments are now program-scoped.
            </p>
            <p className="text-sm">
              Your reviewer assignments will appear in the main dashboard under
              "Reviewer for Programs".
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
