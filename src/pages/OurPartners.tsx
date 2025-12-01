import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignOutButton from "../components/SignOutButton";
import { useAuth } from "../auth/AuthProvider";

function OurPartners() {
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
            Our Partners
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Organizations that trust Omnipply to streamline their application
            processes.
          </p>
        </div>
      </div>

      {/* Partners Section */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="space-y-16">
            {/* Boise Gems */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img
                    src="/BoiseGems.png"
                    alt="Boise Gems Drum and Bugle Corps"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Boise Gems Drum and Bugle Corps
                  </h2>
                  <p className="text-lg text-gray-700 leading-relaxed mb-6">
                    Boise Gems is a premier drum and bugle corps organization
                    that uses Omnipply to manage their application process,
                    making it easier for talented musicians to apply and for the
                    organization to review applications efficiently.
                  </p>
                  <p className="text-base text-gray-600">
                    "Omnipply has transformed how we handle applications. The
                    streamlined process has allowed us to focus more on what we
                    do best - making music."
                  </p>
                </div>
              </div>
            </div>

            {/* Join Us Section */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-lg shadow-lg p-12 text-center text-white">
              <h2 className="text-4xl font-bold mb-6">
                Organizations, Join Us!
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join leading organizations like Boise Gems Drum and Bugle Corps
                in streamlining your application process, lowering barriers, and
                increasing outreach!
              </p>
              <button
                onClick={() => navigate("/")}
                className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
              >
                Get Started as an Organization
              </button>
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

export default OurPartners;

