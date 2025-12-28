import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import OrganizationSignupModal from "./components/OrganizationSignupModal";
import { useAuth } from "./auth/AuthProvider";
import SignOutButton from "./components/SignOutButton";

function NewLaunchPage() {
  const [open, setOpen] = useState(false);
  const [orgSignupOpen, setOrgSignupOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full">
      {/* Navigation */}
      <nav className="bg-white shadow-sm relative">
        {/* Logo positioned absolutely at top-left corner with responsive sizing */}
        <div className="absolute top-0 left-1 sm:top-1 sm:left-4 z-10">
          <img
            src="/Omnipply.png"
            alt="Omnipply Logo"
            className="h-16 w-auto sm:h-32 md:h-40"
          />
        </div>

        <div className="py-4 sm:py-12 md:py-16">
          {/* Right side - Login button or Sign out */}
          <div className="flex justify-end items-start pt-2 sm:pt-4 md:items-center md:pt-0 pl-2 sm:pl-6 md:pl-8 pr-3 sm:pr-16 md:pr-24">
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <div className="text-right">
                  <p className="hidden md:block text-xs text-gray-500">
                    Welcome back,
                  </p>
                  <p className="hidden md:block text-sm font-semibold text-gray-800">
                    {user.email}
                  </p>
                </div>
                <SignOutButton />
              </div>
            ) : (
              <button
                onClick={() => setOpen(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 md:py-2 md:px-6 rounded-md md:rounded-lg transition-colors shadow-md md:shadow-lg text-xs md:text-base"
              >
                Sign up / Log in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Section 1: Hero + Blue Section - Full Viewport */}
      <section className="min-h-screen flex flex-col overflow-hidden sm:-mt-32 md:-mt-48">
        {/* Hero Section */}
        <div className="bg-white flex items-center justify-center flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-0">
          <div className="text-center text-gray-900 max-w-6xl mx-auto px-4 sm:px-6 w-full mt-8 sm:mt-16 md:mt-24">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4 sm:mb-6">
              Welcome to <span className="text-blue-600">Omnipply</span>
            </h1>
            <p className="text-sm sm:text-base md:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed text-gray-600 px-2">
              Simplifying applications. Amplifying opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center px-4">
              <button
                onClick={() => (user ? navigate("/dashboard") : setOpen(true))}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 px-8 sm:px-10 rounded-xl text-base sm:text-lg md:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                {user ? "Go to Dashboard" : "Sign up / Log in here"}
              </button>
              <button
                onClick={() => setOrgSignupOpen(true)}
                className="w-full sm:w-auto bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-700 font-semibold py-3 sm:py-4 px-8 sm:px-10 rounded-xl text-base sm:text-lg md:text-xl border border-gray-300 transition-all duration-300 transform hover:scale-105"
              >
                Organizations join here
              </button>
            </div>
          </div>
        </div>

        {/* Blue Section - Anchored at Bottom */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-6 sm:py-8 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Organizations Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-white/20 rounded-full p-2 sm:p-2.5">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-white text-base sm:text-xl font-bold">
                    For Organizations
                  </h3>
                </div>
                <p className="text-white/90 text-xs sm:text-base leading-relaxed">
                  Build/review applications, publish results, and advertise all
                  on one platform.
                </p>
              </div>

              {/* Applicants Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/20 shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-white/20 rounded-full p-2 sm:p-2.5">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
                  <h3 className="text-white text-base sm:text-xl font-bold">
                    For Applicants
                  </h3>
                </div>
                <p className="text-white/90 text-xs sm:text-base leading-relaxed">
                  Discover opportunities through our "for you page". Apply to
                  multiple programs with one application.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Our Partners */}

      <section className="bg-white py-8 sm:py-12 md:py-16 mt-12 sm:mt-20 md:mt-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-center text-gray-900 mb-6 sm:mb-8 md:mb-12">
            Our Partners
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-12">
            {/* Boise Gems Image */}
            <div className="flex-shrink-0">
              <img
                src="/BoiseGems.png"
                alt="Boise Gems Drum and Bugle Corps"
                className="w-full max-w-md h-auto rounded-lg shadow-lg"
              />
            </div>

            {/* Join Us Content */}
            <div className="text-center md:text-left flex-1 max-w-md px-4 sm:px-0">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Organizations, Join Us!
              </h3>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-5 sm:mb-6 leading-relaxed">
                Join leading organizations like Boise Gems Drum and Bugle Corps
                in streamlining your application process, lowering barriers, and
                increasing outreach!
              </p>
              <button
                onClick={() => setOrgSignupOpen(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Get Started as an Organization
              </button>
            </div>
          </div>
        </div>
      </section>

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
      {!user && <LoginModal open={open} onClose={() => setOpen(false)} />}
      <OrganizationSignupModal
        open={orgSignupOpen}
        onClose={() => setOrgSignupOpen(false)}
      />
    </div>
  );
}

export default NewLaunchPage;
