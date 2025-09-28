import React, { useState, useEffect } from "react";
import { useLocation, Navigate, useNavigate, Link } from "react-router-dom";
import DashboardHeader from "./components/DashboardHeader.tsx";
import DashboardNavigation from "./components/DashboardNavigation.tsx";
import CapabilityHub from "./components/CapabilityHub.tsx";
import { loadCapabilities, hasAnyCapabilities } from "./lib/capabilities";
import { supabase } from "./lib/supabase";
import { startOrGetApplication } from "./lib/rpc";

// Expanded corps data
const allCorps = [
  {
    id: 1,
    name: "Santa Clara Vanguard",
    slug: "santa-clara-vanguard",
    class: "World Class",
    founded: 1967,
    status: "Open for Auditions",
    statusColor: "text-blue-600",
    gradient: "from-red-600 to-red-800",
    tagColor: "bg-red-100 text-red-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Premier drum corps with a legacy of excellence. Known for innovative programming and world-class performances.",
  },
  {
    id: 2,
    name: "Boise Gems",
    slug: "boise-gems",
    class: "Open Class",
    founded: 2022,
    status: "Accepting Members",
    statusColor: "text-green-600",
    gradient: "from-purple-600 to-purple-800",
    tagColor: "bg-purple-100 text-purple-800",
    buttonColor: "bg-purple-600 hover:bg-blue-700",
    description:
      "Emerging drum corps building a strong foundation. Focus on education and growth for all skill levels.",
  },
  {
    id: 3,
    name: "Demo Corps",
    slug: "demo-corps",
    class: "Demo Class",
    founded: 2024,
    status: "Fall Auditions Open",
    statusColor: "text-green-600",
    gradient: "from-green-600 to-green-800",
    tagColor: "bg-green-100 text-green-800",
    buttonColor: "bg-green-600 hover:bg-green-700",
    description:
      "Demo drum corps showcasing our platform's audition management system. Fall auditions now open for all sections - brass, percussion, and color guard. Experience our streamlined application process!",
  },
  {
    id: 4,
    name: "Blue Devils",
    slug: "blue-devils",
    class: "World Class",
    founded: 1957,
    status: "Season Complete",
    statusColor: "text-gray-600",
    gradient: "from-blue-900 to-blue-700",
    tagColor: "bg-blue-100 text-blue-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Legendary drum corps with multiple world championships. Known for innovative design and technical excellence.",
  },
  {
    id: 5,
    name: "Carolina Crown",
    slug: "carolina-crown",
    class: "World Class",
    founded: 1988,
    status: "Planning Next Season",
    statusColor: "text-yellow-600",
    gradient: "from-yellow-600 to-orange-600",
    tagColor: "bg-yellow-100 text-yellow-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Premier drum corps known for brass excellence and innovative programming. Multiple world championship finalist.",
  },
  {
    id: 6,
    name: "Phantom Regiment",
    slug: "phantom-regiment",
    class: "World Class",
    founded: 1956,
    status: "Auditions Coming Soon",
    statusColor: "text-purple-600",
    gradient: "from-purple-800 to-purple-600",
    tagColor: "bg-purple-100 text-purple-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Classic drum corps with a rich tradition. Known for powerful brass and emotional performances.",
  },
  {
    id: 7,
    name: "Bluecoats",
    slug: "bluecoats",
    class: "World Class",
    founded: 1972,
    status: "Season Complete",
    statusColor: "text-gray-600",
    gradient: "from-blue-600 to-blue-400",
    tagColor: "bg-blue-100 text-blue-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Innovative drum corps pushing boundaries in design and performance. Multiple world championship finalist.",
  },
  {
    id: 8,
    name: "Boston Crusaders",
    slug: "boston-crusaders",
    class: "World Class",
    founded: 1940,
    status: "Planning Next Season",
    statusColor: "text-yellow-600",
    gradient: "from-red-700 to-red-500",
    tagColor: "bg-red-100 text-red-800",
    buttonColor: "bg-red-600 hover:bg-red-700",
    description:
      "One of the oldest drum corps in the world. Rich history and tradition of excellence.",
  },
];

// Expanded scholarships data
const allScholarships = [
  {
    id: 1,
    name: "Friends of DCI Scholarship",
    provider: "DCI",
    amount: "$2,500",
    deadline: "March 15, 2024",
    status: "Open for Applications",
    statusColor: "text-green-600",
    gradient: "from-green-600 to-green-800",
    tagColor: "bg-green-100 text-green-800",
    buttonColor: "bg-green-600 hover:bg-green-700",
    description:
      "Premier scholarship for outstanding drum corps members. Covers tuition, fees, and educational expenses.",
    requirements: "Minimum 3.5 GPA, DCI member for 2+ seasons",
  },
  {
    id: 2,
    name: "DCI Excellence in Music Scholarship",
    provider: "DCI",
    amount: "$1,500",
    deadline: "April 1, 2024",
    status: "Open for Applications",
    statusColor: "text-blue-600",
    gradient: "from-blue-600 to-blue-800",
    tagColor: "bg-blue-100 text-blue-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Recognizes exceptional musical talent and dedication in drum corps performance.",
    requirements: "Outstanding musical achievement, letter of recommendation",
  },
  {
    id: 3,
    name: "Blue Devils Educational Foundation",
    provider: "Blue Devils",
    amount: "$3,000",
    deadline: "February 28, 2024",
    status: "Open for Applications",
    statusColor: "text-blue-600",
    gradient: "from-blue-900 to-blue-700",
    tagColor: "bg-blue-100 text-blue-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    description:
      "Comprehensive scholarship supporting Blue Devils alumni pursuing higher education.",
    requirements: "Blue Devils alumni, pursuing music education or performance",
  },
  {
    id: 4,
    name: "Santa Clara Vanguard Legacy Scholarship",
    provider: "Santa Clara Vanguard",
    amount: "$2,000",
    deadline: "March 31, 2024",
    status: "Open for Applications",
    statusColor: "text-red-600",
    gradient: "from-red-600 to-red-800",
    tagColor: "bg-red-100 text-red-800",
    buttonColor: "bg-red-600 hover:bg-red-700",
    description:
      "Honors Vanguard members who demonstrate leadership and commitment to excellence.",
    requirements: "Vanguard member, leadership experience, 3.0+ GPA",
  },
  {
    id: 5,
    name: "Carolina Crown Brass Scholarship",
    provider: "Carolina Crown",
    amount: "$1,800",
    deadline: "April 15, 2024",
    status: "Open for Applications",
    statusColor: "text-yellow-600",
    gradient: "from-yellow-600 to-orange-600",
    tagColor: "bg-yellow-100 text-yellow-800",
    buttonColor: "bg-yellow-600 hover:bg-yellow-700",
    description:
      "Specialized scholarship for brass players demonstrating exceptional skill and dedication.",
    requirements:
      "Brass section member, outstanding performance, musical excellence",
  },
  {
    id: 6,
    name: "Phantom Regiment Tradition Award",
    provider: "Phantom Regiment",
    amount: "$2,200",
    deadline: "March 20, 2024",
    status: "Open for Applications",
    statusColor: "text-purple-600",
    gradient: "from-purple-800 to-purple-600",
    tagColor: "bg-purple-100 text-purple-800",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    description:
      "Preserves the legacy of Phantom Regiment through educational support for deserving members.",
    requirements:
      "Phantom Regiment member, commitment to tradition, academic achievement",
  },
  {
    id: 7,
    name: "DCI Community Service Scholarship",
    provider: "DCI",
    amount: "$1,000",
    deadline: "May 1, 2024",
    status: "Open for Applications",
    statusColor: "text-green-600",
    gradient: "from-green-700 to-green-500",
    tagColor: "bg-green-100 text-green-800",
    buttonColor: "bg-green-600 hover:bg-green-700",
    description:
      "Recognizes drum corps members who make significant contributions to their communities.",
    requirements: "Community service hours, letter of recommendation, 3.0+ GPA",
  },
  {
    id: 8,
    name: "Open Class Achievement Scholarship",
    provider: "DCI",
    amount: "$1,200",
    deadline: "April 30, 2024",
    status: "Open for Applications",
    statusColor: "text-purple-600",
    gradient: "from-purple-600 to-purple-400",
    tagColor: "bg-purple-100 text-purple-800",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    description:
      "Supports Open Class members pursuing educational goals and personal development.",
    requirements:
      "Open Class member, academic achievement, personal growth essay",
  },
];

function FeaturedCorps() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCorps, setFilteredCorps] = useState(allCorps);
  const navigate = useNavigate();

  useEffect(() => {
    const filtered = allCorps.filter((corps) =>
      corps.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCorps(filtered);
  }, [searchTerm]);

  // Always show exactly 3 corps - either first 3 or first 3 of filtered results
  const displayCorps =
    searchTerm.trim() === "" ? allCorps.slice(0, 3) : filteredCorps.slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Search Section - Compact */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Search for a drum corps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 px-6 text-base border-2 border-gray-200 rounded-full focus:border-blue-500 focus:outline-none shadow-lg pr-24 transition-all duration-200 hover:shadow-xl focus:shadow-xl"
          />
          <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors text-sm font-medium h-8">
            Search
          </button>
        </div>
      </div>

      {/* Corps Grid - Always 3 cards, consistent sizing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {displayCorps.map((corps) => (
          <div
            key={corps.id}
            className="w-full bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden flex flex-col h-full"
          >
            <div
              className={`h-48 bg-gradient-to-br ${corps.gradient} flex items-center justify-center`}
            >
              <h3 className="text-white text-2xl font-bold text-center px-6">
                {corps.name}
              </h3>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex items-center mb-6">
                <span
                  className={`${corps.tagColor} text-xs font-semibold px-4 py-2 rounded-full`}
                >
                  {corps.class}
                </span>
                <span className="ml-4 text-gray-500 text-sm">
                  Founded {corps.founded}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-8 flex-grow text-base">
                {corps.description}
              </p>
              <div className="mt-auto flex justify-between items-center">
                <span className={`${corps.statusColor} font-semibold text-sm`}>
                  {corps.status}
                </span>
                <button
                  className={`${corps.buttonColor} text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors`}
                  onClick={() => {
                    navigate(`/org/${corps.slug}`);
                  }}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedScholarships() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredScholarships, setFilteredScholarships] =
    useState(allScholarships);

  useEffect(() => {
    const filtered = allScholarships.filter((scholarship) =>
      scholarship.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredScholarships(filtered);
  }, [searchTerm]);

  // Always show exactly 3 scholarships - either first 3 or first 3 of filtered results
  const displayScholarships =
    searchTerm.trim() === ""
      ? allScholarships.slice(0, 3)
      : filteredScholarships.slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-0">
      {/* Search Section */}
      <div className="mb-6 md:mb-8">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Search all programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 md:h-14 px-4 md:px-6 text-base md:text-lg border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none shadow-lg pr-24 md:pr-32 transition-all duration-200 hover:shadow-xl focus:shadow-xl bg-white"
          />
          <button className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-full transition-colors text-xs md:text-sm font-medium h-8 md:h-10">
            Search
          </button>
        </div>
      </div>

      {/* Scholarships Grid - Always 3 cards, consistent sizing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
        {displayScholarships.map((scholarship) => (
          <div
            key={scholarship.id}
            className="w-full bg-white rounded-xl md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden flex flex-col h-full"
          >
            <div
              className={`h-32 md:h-48 bg-gradient-to-br ${scholarship.gradient} flex items-center justify-center p-3 md:p-4`}
            >
              <h3 className="text-white text-sm md:text-xl font-bold text-center leading-tight">
                {scholarship.name}
              </h3>
            </div>
            <div className="p-4 md:p-8 flex-1 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
                <span
                  className={`${scholarship.tagColor} text-xs font-semibold px-3 md:px-4 py-1 md:py-2 rounded-full mb-2 md:mb-0`}
                >
                  {scholarship.provider}
                </span>
                <span className="text-green-600 font-bold text-base md:text-lg">
                  {scholarship.amount}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 md:mb-8 flex-grow text-sm md:text-base">
                {scholarship.description}
              </p>
              <div className="mb-6 md:mb-8">
                <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3">
                  <span className="font-semibold">Requirements:</span>{" "}
                  {scholarship.requirements}
                </p>
                <p className="text-gray-600 text-xs md:text-sm">
                  <span className="font-semibold">Deadline:</span>{" "}
                  {scholarship.deadline}
                </p>
              </div>
              <div className="mt-auto flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                <span
                  className={`${scholarship.statusColor} font-semibold text-xs md:text-sm`}
                >
                  {scholarship.status}
                </span>
                <button
                  className={`${scholarship.buttonColor} text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-colors`}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Auditions() {
  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Auditions</h2>
      </div>
      <FeaturedCorps />
    </div>
  );
}

// TIMES SQUARE-STYLE FEATURED PROGRAMS (Rotating Carousel + Gallery)
function FeaturedPrograms() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carousel, setCarousel] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured items from RPC
  useEffect(() => {
    let mounted = true;
    const loadFeatured = async () => {
      try {
        const [{ data: carouselData }, { data: galleryData }] =
          await Promise.all([
            supabase.rpc("featured_public", { p_placement: "carousel" }),
            supabase.rpc("featured_public", { p_placement: "gallery" }),
          ]);

        if (!mounted) return;

        // Enrich carousel data with detailed information
        const enrichedCarousel = await Promise.all(
          (carouselData ?? []).map(async (item) => {
            try {
              if (item.target_type === "program") {
                const { data: programData } = await supabase
                  .from("programs")
                  .select("description, open_at, close_at")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...programData };
              } else if (item.target_type === "org") {
                const { data: orgData } = await supabase
                  .from("organizations")
                  .select("description, slug")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...orgData };
              } else if (item.target_type === "coalition") {
                const { data: coalitionData } = await supabase
                  .from("coalitions")
                  .select("description, slug")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...coalitionData };
              }
              return item;
            } catch (error) {
              console.error(
                `Error enriching ${item.target_type} ${item.target_id}:`,
                error
              );
              return item;
            }
          })
        );

        // Enrich gallery data with detailed information
        const enrichedGallery = await Promise.all(
          (galleryData ?? []).map(async (item) => {
            try {
              if (item.target_type === "program") {
                const { data: programData } = await supabase
                  .from("programs")
                  .select("description, open_at, close_at")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...programData };
              } else if (item.target_type === "org") {
                const { data: orgData } = await supabase
                  .from("organizations")
                  .select("description, slug")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...orgData };
              } else if (item.target_type === "coalition") {
                const { data: coalitionData } = await supabase
                  .from("coalitions")
                  .select("description, slug")
                  .eq("id", item.target_id)
                  .single();
                return { ...item, ...coalitionData };
              }
              return item;
            } catch (error) {
              console.error(
                `Error enriching ${item.target_type} ${item.target_id}:`,
                error
              );
              return item;
            }
          })
        );

        setCarousel(enrichedCarousel);
        setGallery(enrichedGallery);
      } catch (error) {
        console.error("Error loading featured items:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFeatured();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (carousel.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carousel.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carousel.length]);

  const handlePrimaryClick = async (item: any) => {
    // Route logic by target type - slugs are now available from enrichment
    if (item.target_type === "org" && item.slug) {
      navigate(`/org/${item.slug}`);
      return;
    }

    if (item.target_type === "coalition" && item.slug) {
      navigate(`/coalitions/${item.slug}`);
      return;
    }

    if (item.target_type === "program") {
      // For programs, start or get application and navigate to it
      try {
        const app = await startOrGetApplication(item.target_id);
        navigate(`/applications/${app.id}`);
      } catch (e) {
        console.error("Failed to start application:", e);
        alert("Could not start application. Please try again.");
      }
      return;
    }
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Featured Programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section - Keep the header you liked */}

      {/* Featured Carousel - Mobile-First Design */}
      {carousel.length > 0 && (
        <div className="mb-4 md:mb-16">
          <div className="relative bg-white rounded-lg md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden border border-gray-100 md:border-2 md:border-gray-100 mx-1 md:mx-0">
            <div className="relative h-56 md:h-96">
              {carousel.map((item, index) => (
                <div
                  key={item.featured_id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div
                    className={`h-full bg-gradient-to-br ${
                      item.gradient || "from-blue-600 to-blue-800"
                    } flex items-center justify-center relative`}
                  >
                    <div className="text-center text-white p-3 md:p-8 max-w-4xl">
                      <div className="flex flex-col md:flex-row items-center justify-center mb-1 md:mb-4">
                        <h2 className="text-lg md:text-4xl font-bold drop-shadow-lg mb-2 md:mb-0 md:mr-4">
                          {item.title || item.name || "Featured"}
                        </h2>
                        <span
                          className={`${
                            item.target_type === "org"
                              ? "bg-green-100 text-green-800"
                              : item.target_type === "coalition"
                              ? "bg-purple-100 text-purple-800"
                              : item.target_type === "program"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          } text-xs md:text-sm font-semibold px-2 md:px-4 py-1 md:py-2 rounded-full capitalize`}
                        >
                          {item.target_type}
                          {item.program_type ? ` · ${item.program_type}` : ""}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs md:text-xl mb-2 md:mb-6 opacity-90 max-w-2xl mx-auto hidden md:block">
                          {item.description}
                        </p>
                      )}

                      {/* Deadline Information for Programs */}
                      {(item.open_at || item.close_at) && (
                        <div className="mb-3 md:mb-6 text-white/90">
                          {item.open_at && (
                            <div className="text-xs md:text-sm mb-1">
                              <span className="font-semibold">Opens:</span>{" "}
                              {new Date(item.open_at).toLocaleDateString()}
                            </div>
                          )}
                          {item.close_at && (
                            <div className="text-xs md:text-sm">
                              <span className="font-semibold">Deadline:</span>{" "}
                              {new Date(item.close_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        className={`${
                          item.button_color || "bg-blue-600 hover:bg-blue-700"
                        } text-white px-4 md:px-8 py-2 md:py-4 rounded-md md:rounded-xl text-xs md:text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl relative z-10`}
                        onClick={() => handlePrimaryClick(item)}
                      >
                        {item.button_label || "Learn More"}
                      </button>
                    </div>

                    {/* Subtle animated elements - hidden on mobile */}
                    <div className="absolute inset-0 opacity-10 hidden md:block pointer-events-none">
                      <div className="absolute top-8 left-8 w-12 h-12 border-2 border-white rounded-full animate-pulse"></div>
                      <div className="absolute bottom-8 right-8 w-8 h-8 border-2 border-white rounded-full animate-ping"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Navigation Dots */}
            <div className="absolute bottom-1 md:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 md:space-x-2 pointer-events-none">
              {carousel.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-1.5 h-1.5 md:w-3 md:h-3 rounded-full transition-colors pointer-events-auto ${
                    index === currentSlide ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Section - Mobile-First Cards */}
      <div className="mb-6 md:mb-12 px-1 md:px-0">
        <h2 className="text-lg md:text-3xl font-bold text-gray-900 mb-4 md:mb-8 text-center">
          More Programs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {gallery.map((item, idx) => (
            <div
              key={item.featured_id}
              className="bg-white rounded-md md:rounded-xl shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 md:hover:-translate-y-2 border border-gray-100 overflow-hidden group flex flex-col"
            >
              <div
                className={`h-20 md:h-32 bg-gradient-to-br ${
                  item.gradient || "from-blue-600 to-blue-800"
                } flex items-center justify-center`}
              >
                <h3 className="text-white text-xs md:text-lg font-bold text-center px-2 md:px-4">
                  {item.title || item.name || "Featured"}
                </h3>
              </div>
              <div className="p-2 md:p-4 flex flex-col flex-grow">
                <div className="flex flex-col md:flex-row md:items-center mb-2 md:mb-3">
                  <span
                    className={`${
                      item.target_type === "org"
                        ? "bg-green-100 text-green-800"
                        : item.target_type === "coalition"
                        ? "bg-purple-100 text-purple-800"
                        : item.target_type === "program"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    } text-xs font-semibold px-2 py-1 rounded-full mb-1 md:mb-0 capitalize`}
                  >
                    {item.target_type}
                    {item.program_type ? ` · ${item.program_type}` : ""}
                  </span>
                </div>
                {item.description && (
                  <p className="text-gray-700 text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden md:block">
                    {item.description}
                  </p>
                )}

                {/* Deadline Information */}
                {(item.open_at || item.close_at) && (
                  <div className="mb-3 md:mb-4 mt-2 md:mt-4">
                    {item.open_at && (
                      <div className="flex items-center mb-1">
                        <span className="text-gray-600 text-xs md:text-sm font-bold mr-2">
                          Opens:
                        </span>
                        <span className="text-gray-800 text-xs md:text-sm font-bold">
                          {new Date(item.open_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {item.close_at && (
                      <div className="flex items-center">
                        <span className="text-gray-600 text-xs md:text-sm font-bold mr-2">
                          Deadline:
                        </span>
                        <span className="text-gray-800 text-xs md:text-sm font-bold">
                          {new Date(item.close_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-grow" />
                <div className="flex justify-between items-center mt-auto">
                  <button
                    className={`${
                      item.button_color || "bg-blue-600 hover:bg-blue-700"
                    } text-white px-2 md:px-3 py-1 rounded-md md:rounded-lg text-xs font-medium transition-colors`}
                    onClick={() => handlePrimaryClick(item)}
                  >
                    {item.button_label || "View"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              Nothing featured yet.
            </div>
          )}
        </div>
      </div>

      {/* Call to Action Section */}
    </div>
  );
}

// Helper functions for generating gradients and colors
const gradients = [
  "from-blue-600 to-blue-800",
  "from-purple-600 to-purple-800",
  "from-green-600 to-green-800",
  "from-red-600 to-red-800",
  "from-yellow-600 to-yellow-800",
  "from-pink-600 to-pink-800",
  "from-indigo-600 to-indigo-800",
  "from-teal-600 to-teal-800",
];

const tagColors = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-red-100 text-red-800",
  "bg-yellow-100 text-yellow-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
];

function getGradientForIndex(index) {
  return gradients[index % gradients.length];
}

function getTagColorForIndex(index) {
  return tagColors[index % tagColors.length];
}

// ALL PROGRAMS TAB (Regular Programs)
function AllOrgs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [filteredCorps, setFilteredCorps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch real organizations from database with coalition data
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // Fetch organizations with their coalition memberships
        const { data, error } = await supabase
          .from("organizations")
          .select(
            `
            *,
            coalition_memberships(
              coalition_id,
              coalitions(
                name,
                slug
              )
            )
          `
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching organizations:", error);
          return;
        }

        // Transform database data to match the expected format
        const transformedOrgs = data.map((org, index) => {
          // Handle multiple coalition memberships
          const coalitionMemberships = org.coalition_memberships || [];

          let coalitionDisplay;
          if (coalitionMemberships.length === 0) {
            coalitionDisplay = "Independent";
          } else if (coalitionMemberships.length === 1) {
            coalitionDisplay =
              coalitionMemberships[0]?.coalitions?.name || "Unknown Coalition";
          } else {
            // Multiple coalitions - show count or first few names
            const coalitionNames = coalitionMemberships
              .map((membership) => membership?.coalitions?.name)
              .filter((name) => name)
              .slice(0, 2); // Show first 2 coalition names

            if (coalitionNames.length === 2) {
              coalitionDisplay = `${coalitionNames[0]}, ${coalitionNames[1]}`;
            } else {
              coalitionDisplay = `${coalitionNames[0]} +${
                coalitionMemberships.length - 1
              }`;
            }
          }

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            class: coalitionDisplay, // Use coalition name(s) instead of "Organization"
            status: "Active",
            statusColor: "text-green-600",
            gradient: getGradientForIndex(index),
            tagColor: getTagColorForIndex(index),
            buttonColor: "bg-blue-600 hover:bg-blue-700",
            description:
              org.description || "A great organization on our platform.",
          };
        });

        setOrganizations(transformedOrgs);
        setFilteredCorps(transformedOrgs);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    const filtered = organizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCorps(filtered);
  }, [searchTerm, organizations]);

  if (loading) {
    return (
      <div className="w-full px-2 md:px-0">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-0">
      {/* Search Section */}
      <div className="mb-6 md:mb-8">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Search all programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 md:h-14 px-4 md:px-6 text-base md:text-lg border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none shadow-lg pr-24 md:pr-32 transition-all duration-200 hover:shadow-xl focus:shadow-xl bg-white"
          />
          <button className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-full transition-colors text-xs md:text-sm font-medium h-8 md:h-10">
            Search
          </button>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredCorps.map((corps) => (
          <div
            key={corps.id}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden flex flex-col"
          >
            <div
              className={`h-32 md:h-48 bg-gradient-to-br ${corps.gradient} flex items-center justify-center`}
            >
              <h3 className="text-white text-lg md:text-2xl font-bold text-center px-4 md:px-6">
                {corps.name}
              </h3>
            </div>
            <div className="p-4 md:p-6 flex flex-col flex-grow">
              <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-4">
                <span
                  className={`${corps.tagColor} text-xs font-semibold px-2 md:px-3 py-1 rounded-full mb-1 md:mb-0`}
                >
                  {corps.class}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4 md:mb-6 text-xs md:text-sm">
                {corps.description}
              </p>

              {/* Spacer to push footer to bottom */}
              <div className="flex-grow"></div>

              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0 mt-auto">
                <span
                  className={`${corps.statusColor} font-semibold text-xs md:text-sm`}
                >
                  {corps.status}
                </span>
                <button
                  className={`${corps.buttonColor} text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors`}
                  onClick={() => navigate(`/org/${corps.slug}`)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ALL PROGRAMS TAB (All Programs with Filters)
function AllPrograms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [programs, setPrograms] = useState<any[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const navigate = useNavigate();

  // Fetch all programs from database
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        // Fetch programs with organization data
        const { data, error } = await supabase
          .from("programs")
          .select(
            `
            *,
            organizations(
              id,
              name,
              slug,
              coalition_memberships(
                coalition_id,
                coalitions(
                  name,
                  slug
                )
              )
            )
          `
          )
          .is("deleted_at", null)
          .eq("published", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching programs:", error);
          return;
        }

        // Transform database data to match the expected format
        const transformedPrograms = data.map((program, index) => {
          const org = program.organizations;
          const coalitionMemberships = org?.coalition_memberships || [];

          let coalitionDisplay;
          if (coalitionMemberships.length === 0) {
            coalitionDisplay = "Independent";
          } else if (coalitionMemberships.length === 1) {
            coalitionDisplay =
              coalitionMemberships[0]?.coalitions?.name || "Unknown Coalition";
          } else {
            const coalitionNames = coalitionMemberships
              .map((membership) => membership?.coalitions?.name)
              .filter((name) => name)
              .slice(0, 2);

            if (coalitionNames.length === 2) {
              coalitionDisplay = `${coalitionNames[0]}, ${coalitionNames[1]}`;
            } else {
              coalitionDisplay = `${coalitionNames[0]} +${
                coalitionMemberships.length - 1
              }`;
            }
          }

          return {
            id: program.id,
            name: program.name,
            slug: program.slug,
            type: program.type,
            organization: org?.name || "Unknown Organization",
            organizationSlug: org?.slug,
            class: coalitionDisplay,
            status: program.published ? "Open" : "Closed",
            statusColor: program.published ? "text-green-600" : "text-red-600",
            gradient: getGradientForIndex(index),
            tagColor: getTagColorForIndex(index),
            buttonColor: "bg-blue-600 hover:bg-blue-700",
            description:
              program.description || "A great program on our platform.",
            openAt: program.open_at,
            closeAt: program.close_at,
          };
        });

        setPrograms(transformedPrograms);
        setFilteredPrograms(transformedPrograms);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  useEffect(() => {
    let filtered = programs.filter(
      (program) =>
        program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.organization.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((program) => program.type === selectedType);
    }

    setFilteredPrograms(filtered);
  }, [searchTerm, selectedType, programs]);

  if (loading) {
    return (
      <div className="w-full px-2 md:px-0">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading programs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-0">
      {/* Search and Filter Section */}
      <div className="mb-6 md:mb-8">
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center bg-white border-2 border-gray-300 rounded-full focus-within:border-blue-500 shadow-lg hover:shadow-xl focus-within:shadow-xl transition-all duration-200">
            {/* Type Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-0 bg-transparent focus:outline-none cursor-pointer appearance-none pr-8 md:pr-10 text-gray-700 font-medium"
              >
                <option value="all">All Types</option>
                <option value="application">Applications</option>
                <option value="audition">Auditions</option>
                <option value="scholarship">Scholarships</option>
                <option value="competition">Competitions</option>
              </select>

              {/* Custom Dropdown Arrow */}
              <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300"></div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search all programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-12 md:h-14 px-4 md:px-6 text-base md:text-lg focus:outline-none bg-transparent"
            />

            {/* Search Button */}
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-full transition-colors text-xs md:text-sm font-medium h-8 md:h-10 mr-1 md:mr-2">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredPrograms.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden flex flex-col"
          >
            <div
              className={`h-32 md:h-48 bg-gradient-to-br ${program.gradient} flex items-center justify-center`}
            >
              <h3 className="text-white text-lg md:text-2xl font-bold text-center px-4 md:px-6">
                {program.name}
              </h3>
            </div>
            <div className="p-4 md:p-6 flex flex-col flex-grow">
              <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-4">
                <span
                  className={`${program.tagColor} text-xs font-semibold px-2 md:px-3 py-1 rounded-full mb-1 md:mb-0`}
                >
                  {program.organization}
                </span>
                <span className="text-gray-500 text-xs md:text-sm md:ml-3 capitalize">
                  {program.type}
                </span>
              </div>

              {program.description && (
                <p className="text-gray-700 leading-relaxed mb-3 md:mb-4 text-xs md:text-sm">
                  {program.description}
                </p>
              )}

              {/* Deadline Information */}
              {(program.openAt || program.closeAt) && (
                <div className="mb-4 md:mb-6 mt-4 md:mt-6">
                  {program.openAt && (
                    <div className="flex items-center mb-2">
                      <span className="text-gray-600 text-xs md:text-sm font-bold mr-2">
                        Opens:
                      </span>
                      <span className="text-gray-800 text-xs md:text-sm font-bold">
                        {new Date(program.openAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {program.closeAt && (
                    <div className="flex items-center">
                      <span className="text-gray-600 text-xs md:text-sm font-bold mr-2">
                        Deadline:
                      </span>
                      <span className="text-gray-800 text-xs md:text-sm font-bold">
                        {new Date(program.closeAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Spacer to push footer to bottom */}
              <div className="flex-grow"></div>

              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0 mt-auto">
                <span
                  className={`${program.statusColor} font-semibold text-xs md:text-sm`}
                >
                  {program.status}
                </span>
                <button
                  className={`${program.buttonColor} text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors`}
                  onClick={async () => {
                    try {
                      const app = await startOrGetApplication(program.id);
                      navigate(`/applications/${app.id}`);
                    } catch (error) {
                      console.error("Failed to start application:", error);
                      alert("Could not start application. Please try again.");
                    }
                  }}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No programs found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}

// COMMENTED OUT - ORIGINAL DASHBOARD FOR BACKUP
// function Dashboard() {
//   const [activeTab, setActiveTab] = useState("Auditions");

//   return (
//     <div className="relative">
//       <DashboardHeader
//         showTabs={true}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         tabs={[
//           { name: "Auditions", label: "Auditions" },
//           { name: "Scholarships", label: "Scholarships" },
//         ]}
//       />
//       <DashboardNavigation />

//       <div className="max-w-6xl mx-auto px-8 py-8">
//         {/* Page Content */}
//         {activeTab === "Auditions" && <Auditions />}
//         {activeTab === "Scholarships" && <Scholarships />}
//       </div>
//     </div>
//   );
// }

// NEW TIMES SQUARE-STYLE APPLICANT DASHBOARD
function Dashboard() {
  const [activeTab, setActiveTab] = useState("Featured");

  return (
    <div className="relative min-h-screen bg-white">
      <DashboardHeader
        showTabs={true}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { name: "Featured", label: "Featured" },
          { name: "All Orgs", label: "All Orgs" },
          { name: "All Programs", label: "All Programs" },
        ]}
      />
      <DashboardNavigation />

      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
        {/* Page Content */}
        {activeTab === "Featured" && <FeaturedPrograms />}
        {activeTab === "All Orgs" && <AllOrgs />}
        {activeTab === "All Programs" && <AllPrograms />}
      </div>
    </div>
  );
}

function SmartDashboard() {
  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const refreshCapabilities = async () => {
    try {
      const caps = await loadCapabilities();
      console.log("SmartDashboard - loaded capabilities:", caps);
      setCapabilities(caps);
    } catch (error) {
      console.error("Failed to load capabilities:", error);
    }
  };

  useEffect(() => {
    refreshCapabilities().finally(() => setLoading(false));
  }, []);

  // Refresh capabilities when navigating to dashboard
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      refreshCapabilities();
    }
  }, [location.pathname]);

  // Periodically refresh capabilities to handle demotion
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCapabilities();
    }, 10000); // Check every 10 seconds for more responsive updates

    return () => clearInterval(interval);
  }, []);

  // Also refresh when the page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshCapabilities();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is superadmin, redirect to /super
  if (capabilities?.userRole === "superadmin") {
    return <Navigate to="/super" replace />;
  }

  // If user has actual assignments (not just role-based capabilities), show the capability hub
  const hasActualAssignments =
    capabilities &&
    (capabilities.adminOrgs.length > 0 ||
      capabilities.reviewerPrograms.length > 0 ||
      capabilities.coalitions.length > 0);

  console.log(
    "SmartDashboard - hasActualAssignments:",
    hasActualAssignments,
    "capabilities:",
    capabilities
  );

  if (hasActualAssignments) {
    return <CapabilityHub />;
  }

  // Otherwise, show the regular dashboard for applicants
  return <Dashboard />;
}

export default SmartDashboard;
