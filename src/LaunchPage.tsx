import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import { useAuth } from "./auth/AuthProvider";
import SignOutButton from "./components/SignOutButton";

function LaunchPage() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full">
      {/* Navigation */}
      <nav className="bg-white shadow-sm relative">
        {/* Logo positioned absolutely at top-left corner with responsive sizing */}
        <div className="absolute top-0 left-2 sm:top-1 sm:left-4 z-10">
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
            Your gateway to drum corps auditions, scholarships, applications,
            and competitions.
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

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          What Omnipply Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Auditions Feature */}
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
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Drum Corps Auditions
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Discover audition opportunities from top World Class and Open
              Class corps. Find the perfect fit for your musical journey.
            </p>
          </div>

          {/* Scholarships Feature */}
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
                  d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Scholarships & Funding
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Access exclusive scholarships and financial aid opportunities.
              Make your drum corps dreams a reality with proper funding.
            </p>
          </div>

          {/* Community Feature */}
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
              Community & Support
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Connect with fellow musicians, alumni, and industry professionals.
              Build your network and get the support you need to succeed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2024 Omnipply. Connecting drum corps talent with opportunities
            worldwide.
          </p>
        </div>
      </footer>
      {!user && <LoginModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default LaunchPage;
