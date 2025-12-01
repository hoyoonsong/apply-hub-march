import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignOutButton from "../components/SignOutButton";
import { useAuth } from "../auth/AuthProvider";

function HelpfulLinks() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <img
                src="/Omnipply.png"
                alt="Omnipply Logo"
                className="h-12 w-auto"
              />
              <button
                onClick={() => navigate("/")}
                className="ml-4 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Omnipply
              </button>
            </div>

            {/* Right side - Sign out or Back to Home */}
            <div className="flex items-center gap-4">
              {user && <SignOutButton />}
              <button
                onClick={() => navigate("/")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Helpful Links
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Quick access to resources and information you might need.
          </p>
        </div>
      </div>

      {/* Links Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Getting Started
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <button
                    onClick={() => navigate("/features")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    How Omnipply Works
                  </button>
                  <span className="text-gray-500 ml-2">
                    - Learn about our platform features
                  </span>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Home Page
                  </button>
                  <span className="text-gray-500 ml-2">
                    - Return to the main landing page
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                For Applicants
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>
                  {user ? (
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      Dashboard
                    </button>
                  ) : (
                    <span className="text-gray-500">
                      Dashboard (Login required)
                    </span>
                  )}
                  <span className="text-gray-500 ml-2">
                    - Access your applications and profile
                  </span>
                </li>
                <li>
                  {user ? (
                    <button
                      onClick={() => navigate("/my-submissions")}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      My Submissions
                    </button>
                  ) : (
                    <span className="text-gray-500">
                      My Submissions (Login required)
                    </span>
                  )}
                  <span className="text-gray-500 ml-2">
                    - View all your submitted applications
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                For Organizations
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <button
                    onClick={() => navigate("/")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Organization Signup
                  </button>
                  <span className="text-gray-500 ml-2">
                    - Join as an organization
                  </span>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/about")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    About Us
                  </button>
                  <span className="text-gray-500 ml-2">
                    - Learn more about Omnipply
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Support
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <a
                    href="mailto:omnipply@gmail.com"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Contact Us
                  </a>
                  <span className="text-gray-500 ml-2">
                    - omnipply@gmail.com
                  </span>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/our-partners")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Our Partners
                  </button>
                  <span className="text-gray-500 ml-2">
                    - See organizations using Omnipply
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 mt-12 sm:mt-24 md:mt-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm sm:text-base">
                © 2025 Omnipply. Simplifying applications. Amplifying
                opportunities.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-evenly items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate("/about")}
                className="text-gray-300 hover:text-white text-sm sm:text-base transition-colors"
              >
                About
              </button>
              <button
                onClick={() => navigate("/helpful-links")}
                className="text-gray-300 hover:text-white text-sm sm:text-base transition-colors"
              >
                Helpful Links
              </button>
              <button
                onClick={() => navigate("/our-partners")}
                className="text-gray-300 hover:text-white text-sm sm:text-base transition-colors"
              >
                Our Partners
              </button>
              <p className="text-gray-300 text-sm sm:text-base font-medium">
                Contact:{" "}
                <a
                  href="mailto:omnipply@gmail.com"
                  className="text-blue-400 hover:text-blue-300 text-sm sm:text-base transition-colors underline"
                >
                  omnipply@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HelpfulLinks;

