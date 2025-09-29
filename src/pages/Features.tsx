import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignOutButton from "../components/SignOutButton";
import { useAuth } from "../auth/AuthProvider";

function Features() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll to top when component mounts
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
            How Omnipply Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how our platform makes application management easier for
            both applicants and organizations.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="space-y-20">
            {/* Central Application Feature */}
            <div className="mb-32">
              <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  One Application, Multiple Programs
                </h3>
                <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  Create your profile once and submit to multiple programs with
                  a single click. Your personal information, essays, and
                  portfolio automatically populate across all applications.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 md:p-12">
                <img
                  src="/ApplicationBoth.png"
                  alt="Applicant's view of custom questions and available input types"
                  className="w-full h-auto rounded-2xl shadow-2xl mx-auto mb-8"
                />
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-semibold">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Choose what auto-fills: Personal Info • Emergency Contact •
                    Essays • Portfolio
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Supplementals Feature */}
            <div className="mb-32">
              <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Organization-Specific Questions
                </h3>
                <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  Each organization can create custom questions tailored to
                  their specific program needs. From short text responses to
                  file uploads, organizations have full control over their
                  application requirements.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 md:p-12">
                <img
                  src="/ApplicationBuilderOrgview.png"
                  alt="Application Builder Interface showing profile autofill and custom questions"
                  className="w-full h-auto rounded-2xl shadow-2xl mx-auto mb-8"
                />
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full text-sm font-semibold">
                    <svg
                      className="w-4 h-4"
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
                    Question Types: Text • Essays • Files • Multiple Choice •
                    and more
                  </div>
                </div>
              </div>
            </div>

            {/* Coalition Applications Feature */}
            <div className="mb-32">
              <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Coalition Applications
                </h3>
                <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  Groups of related organizations can create their own mini
                  central applications. This allows for shared questions and
                  streamlined processes while maintaining organization-specific
                  requirements.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 md:p-12">
                <img
                  src="/ApplicationCoalition.png"
                  alt="Coalition application interface showing shared questions and requirements"
                  className="w-full h-auto rounded-2xl shadow-2xl mx-auto mb-8"
                />
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-full text-sm font-semibold">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Perfect for: Universities • Club Applications • Arts
                    Organizations • and more
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborative Review Feature */}
            <div className="mb-32">
              <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Collaborative Review Process
                </h3>
                <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  Reviewers can add comments, scores, and decisions as they read
                  through applications. Multiple reviewers can collaborate in
                  real-time, with all changes saved automatically.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 md:p-12">
                <img
                  src="/AppReview.png"
                  alt="Application Review Interface showing collaborative commenting, scoring, and decision-making"
                  className="w-full h-auto rounded-2xl shadow-2xl mx-auto mb-8"
                />
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-full text-sm font-semibold">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Features: Real-time Comments • Scoring • Decisions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join organizations and applicants who are already using Omnipply to
            streamline their application process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-transparent hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg border-2 border-white transition-all duration-200 transform hover:scale-105"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2024 Omnipply. Making forms easier for both applicants and
            organizations.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Features;
