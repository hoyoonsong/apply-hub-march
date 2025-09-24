import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import { useAuth } from "./auth/AuthProvider";
import SignOutButton from "./components/SignOutButton";

function NewLaunchPage() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full">
      {/* Navigation */}
      <nav className="bg-white shadow-sm relative">
        {/* Logo positioned absolutely at top-left corner with responsive sizing */}
        <div className="absolute top-2 left-2 sm:top-2 sm:left-4 z-10">
          <img
            src="/Omnipply.png"
            alt="Omnipply Logo"
            className="h-24 w-auto sm:h-32 md:h-40"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
          <div className="flex items-center justify-between">
            {/* Spacer for logo */}
            <div className="w-20 sm:w-28 md:w-40"></div>

            {/* Right side - Login button or Sign out */}
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Welcome back,</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {user.email}
                    </p>
                  </div>
                  <SignOutButton />
                </div>
              ) : (
                <button
                  onClick={() => setOpen(true)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-lg"
                >
                  Sign up / Log in
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-6xl mx-auto px-6 py-20">
        {/* Background Image with Shade */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img
            src="/Santaclaravanguard08.jpg"
            alt="Santa Clara Vanguard Drum Corps"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-70"></div>
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
            Welcome to{" "}
            <span className="text-white drop-shadow-lg">Omnipply</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed text-white drop-shadow-lg">
            Making forms easier for both applicants and organizations.
          </p>
          <br />

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Get Started button - different behavior based on auth state */}
            <button
              onClick={() => (user ? navigate("/dashboard") : setOpen(true))}
              className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </button>
            <button className="bg-transparent hover:bg-white hover:text-blue-600 text-white font-bold py-4 px-8 rounded-xl text-lg border-2 border-white transition-all duration-200 transform hover:scale-105">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Features Section - Integrated from Features page 
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Discover the features of our platform.
            </p>
          </div>
        </div>
      </div> */}

      {/* Feature Cards Section */}
      <div className="py-20 bg-gray-50">
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
                  alt="Application interface showing both applicant and organization views"
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

      {/* COMMENTED OUT: Original "What Omnipply Offers" section with 4 feature cards
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          What Omnipply Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Central Application Feature */
      /*
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
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
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              One Central Application
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Submit one application to multiple programs. Your profile
              information automatically populates across all applications.
            </p>
          </div>

          {/* Organization Supplementals Feature */
      /*
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Organization Supplementals
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Each organization can add custom questions and requirements
              specific to their program needs.
            </p>
          </div>

          {/* Coalition Applications Feature */
      /*
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-purple-600"
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
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Coalition Applications
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Groups of organizations can create their own mini central
              applications with shared questions and requirements.
            </p>
          </div>

          {/* Collaborative Review Feature */
      /*
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-orange-600"
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
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Collaborative Review
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Reviewers can add comments, scores, and decisions as they read
              through applications in real-time.
            </p>
          </div>
        </div>

        {/* Learn More Section */
      /*
        <div className="text-center mt-16">
          <button
            onClick={() => navigate("/features")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
          >
            Learn More About Our Features
          </button>
        </div>
      </div>
      */}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2024 Omnipply. Making forms easier for both applicants and
            organizations.
          </p>
        </div>
      </footer>
      {!user && <LoginModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default NewLaunchPage;
