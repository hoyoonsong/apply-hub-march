import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import { useAuth } from "./auth/AuthProvider";
import SignOutButton from "./components/SignOutButton";

function NewLaunchPage() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full">
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

        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 sm:py-12 md:py-16">
          <div className="flex items-center justify-between">
            {/* Spacer for logo */}
            <div className="w-16 sm:w-28 md:w-40"></div>

            {/* Right side - Login button or Sign out */}
            <div className="flex items-start pt-4 md:items-center md:pt-0">
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
        </div>
      </nav>

      {/* Section 1: Hero + Blue Section - Full Viewport */}
      <section className="h-screen flex flex-col overflow-hidden -mt-48">
        {/* Hero Section */}
        <div className="bg-white flex items-center justify-center flex-1 min-h-0 overflow-y-auto">
          <div className="text-center text-gray-900 max-w-6xl mx-auto px-6 w-full">
            <h1 className="text-3xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-blue-600">Omnipply</span>
            </h1>
            <p className="text-base md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed text-gray-600">
              Simplifying applications. Amplifying opportunities.
            </p>
            <div className="flex flex-col md:flex-row gap-5 justify-center items-center">
              <button
                onClick={() => (user ? navigate("/dashboard") : setOpen(true))}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl text-lg md:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                {user ? "Go to Dashboard" : "Applicants start here"}
              </button>
              <button
                onClick={() => (user ? navigate("/dashboard") : setOpen(true))}
                className="w-full md:w-auto bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-700 font-semibold py-4 px-10 rounded-xl text-lg md:text-xl border border-gray-300 transition-all duration-300 transform hover:scale-105"
              >
                Organizations join here
              </button>
            </div>
          </div>
        </div>

        {/* Blue Section - Anchored at Bottom */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-8 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Organizations Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 rounded-full p-2.5">
                    <svg
                      className="w-6 h-6 text-white"
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
                  <h3 className="text-white text-xl font-bold">
                    For Organizations
                  </h3>
                </div>
                <p className="text-white/90 text-base leading-relaxed">
                  Build/review applications, publish results, and advertise all
                  on one platform.
                </p>
              </div>

              {/* Applicants Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 rounded-full p-2.5">
                    <svg
                      className="w-6 h-6 text-white"
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
                  <h3 className="text-white text-xl font-bold">
                    For Applicants
                  </h3>
                </div>
                <p className="text-white/90 text-base leading-relaxed">
                  Discover opportunities through our "for you page". Apply to
                  multiple programs with one application.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Our Partners */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-center text-gray-900 mb-8 md:mb-12">
            Our Partners
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            {/* Boise Gems Image */}
            <div className="flex-shrink-0">
              <img
                src="/BoiseGems.png"
                alt="Boise Gems Drum and Bugle Corps"
                className="w-full max-w-md h-auto rounded-lg shadow-lg"
              />
            </div>

            {/* Join Us Content */}
            <div className="text-center md:text-left flex-1 max-w-md">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                Organizations, Join Us
              </h3>
              <p className="text-base md:text-lg text-gray-600 mb-6 leading-relaxed">
                Join leading organizations like Boise Gems Drum and Bugle Corps
                in streamlining your application process. Review applications,
                publish results, and advertise—all on one platform.
              </p>
              <button
                onClick={() => (user ? navigate("/dashboard") : setOpen(true))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Get Started as an Organization
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Hidden */}
      <footer className="hidden">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 Omnipply. Simplifying applications. Amplifying opportunities.
          </p>
        </div>
      </footer>
      {!user && <LoginModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default NewLaunchPage;
