import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignOutButton from "../components/SignOutButton";
import { useAuth } from "../auth/AuthProvider";

function About() {
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
            About Omnipply
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simplifying applications. Amplifying opportunities.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8 text-gray-700 leading-relaxed">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Founding and Mission
              </h2>
              <p className="text-lg">
                While watching the 2025 Drum Corps International Championships,
                Hoyoon Song reflected on his own experience in auditioning for
                drum corps and how difficult it was. Every corps had a different
                process, key information was scattered, and the costs were out
                of reach for many performers. He wondered why there wasn’t one
                place to find opportunities—and the scholarships to make them
                possible. <br />
                <br />
                Back at Stanford the following fall, Hoyoon noticed the same
                problem in student clubs: applicants struggled to navigate
                inconsistent applications, and leaders were overwhelmed by
                reviewing them. Seeing that this issue stretched far beyond the
                arts, he set out to build a unified system that makes applying
                easier, reviewing simpler, and opportunities more accessible for
                everyone. <br />
                <br />
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                What We Do
              </h2>
              <p className="text-lg mb-4">
                We streamline the entire application experience. Applicants can
                save time by completing one central application and submitting
                it to multiple programs, while organizations get powerful tools
                to build, manage, and review applications with ease.
                <br />
                <br /> We also tackle one of the most frustrating parts of
                applying: silence. Our system helps organizations communicate
                more clearly and applicants stay informed throughout the
                process.
                <br />
                <br /> And through our Featured page (our version of Times
                Square billboards), organizations can showcase their programs in
                one vibrant, centralized space, helping applicants discover new
                opportunities that truly fit their goals.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Our Values
              </h2>
              <ul className="list-disc list-inside space-y-2 text-lg">
                <li>
                  Accessibility - Lowering barriers to application processes
                </li>
                <li>Efficiency - Streamlining workflows for all users</li>
                <li>
                  Transparency - Clear communication throughout the process
                </li>
                <li>Innovation - Continuously improving our platform</li>
              </ul>

              <br />
              <br />
              <p className="text-lg">
                We are driven by mission, not profit. To solve problems by
                challenging the status quo.
                <br /> We are Omnipply and we have been here to help since
                August 17, 2025.
              </p>
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
            Join organizations and applicants who are already using Omnipply.
          </p>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/")}
            className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
          >
            {user ? "Go to Dashboard" : "Get Started"}
          </button>
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

export default About;
