import { useState, useEffect } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import DashboardHeader from "./components/DashboardHeader.tsx";
import DashboardNavigation from "./components/DashboardNavigation.tsx";
import CapabilityHub from "./components/CapabilityHub.tsx";
import { useCapabilitiesContext } from "./providers/CapabilitiesProvider";
import { supabase } from "./lib/supabase";
import { isBeforeOpenDate, isPastDeadline } from "./lib/deadlineUtils";
// import { startOrGetApplication } from "./lib/rpc";
import { useFeaturedSections } from "./hooks/useFeaturedSections.ts";
import AutoLinkText from "./components/AutoLinkText";

// Utility function to truncate text to approximately 200 characters
function truncateText(text: string, maxLength: number = 200): string {
  if (!text || text.length <= maxLength) return text;
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

// HeroCarousel component for individual carousels
function HeroCarousel({
  items,
  onItemClick,
}: {
  items: any[];
  onItemClick: (item: any) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative bg-white rounded-lg md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden border-2 border-gray-200 mx-1 md:mx-0">
      <div className="relative h-56 md:h-96">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`h-full flex items-center justify-center relative ${
                item.card_color?.startsWith("bg-")
                  ? item.card_color
                  : "bg-gradient-to-br from-blue-600 to-blue-800"
              }`}
              style={
                !item.card_color?.startsWith("bg-") && item.card_color
                  ? { backgroundColor: item.card_color }
                  : undefined
              }
            >
              <div className="text-center text-white p-3 md:p-8 max-w-4xl">
                <div className="flex flex-row items-center justify-center mb-1 md:mb-4">
                  <h2 className="text-lg md:text-4xl font-bold drop-shadow-lg mr-2 md:mr-4">
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
                {/* Show organization name for programs, description for others */}
                {item.target_type === "program" && item.organization ? (
                  <div className="mb-3 md:mb-6 text-white/90 max-w-2xl mx-auto">
                    <div className="text-xs md:text-lg">
                      Offered by {item.organization}
                      <span className="ml-4 md:ml-6">
                        {item.close_at ? (
                          <>
                            Deadline:{" "}
                            {new Date(item.close_at).toLocaleDateString()}
                          </>
                        ) : (
                          "No deadline"
                        )}
                      </span>
                    </div>
                    {/* Spots Information */}
                    {item.spotsText && (
                      <div className="mt-2 md:mt-3 text-xs md:text-base font-medium text-white/95">
                        {item.spotsText}
                      </div>
                    )}
                  </div>
                ) : (
                  item.description && (
                    <div className="text-xs md:text-xl mb-2 md:mb-6 opacity-90 max-w-2xl mx-auto">
                      <AutoLinkText
                        text={truncateText(item.description, 200)}
                      />
                    </div>
                  )
                )}

                <button
                  className={`${
                    item.button_color || "bg-[#1F3A52] hover:bg-[#1a2f44]"
                  } text-white px-4 md:px-8 py-2 md:py-4 rounded-md md:rounded-xl text-xs md:text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl relative z-10`}
                  onClick={() => onItemClick(item)}
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
      {items.length > 1 && (
        <div className="absolute bottom-1 md:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 md:space-x-2 pointer-events-none">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-1.5 h-1.5 md:w-3 md:h-3 rounded-full transition-colors pointer-events-auto ${
                index === currentSlide ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ProgramGrid component for galleries
function ProgramGrid({
  items,
  onItemClick,
}: {
  items: any[];
  onItemClick: (item: any) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200">
        <p className="text-lg">Nothing featured yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-gray-200 overflow-hidden group flex flex-col"
        >
          <div
            className={`h-36 md:h-44 flex items-center justify-center relative overflow-hidden ${
              item.card_color?.startsWith("bg-")
                ? item.card_color
                : "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
            }`}
            style={
              !item.card_color?.startsWith("bg-") && item.card_color
                ? { backgroundColor: item.card_color }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-black/20 group-hover:from-white/5 group-hover:via-white/5 transition-all duration-500"></div>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.4),transparent_50%)]"></div>

            <h3 className="text-white text-lg md:text-xl font-bold text-center px-4 relative z-10 drop-shadow-lg leading-tight">
              {item.title || item.name || "Featured"}
            </h3>

            <div className="absolute top-3 right-3">
              <span
                className={`${
                  item.target_type === "org"
                    ? "bg-emerald-500/95 backdrop-blur-sm text-white"
                    : item.target_type === "coalition"
                    ? "bg-purple-500/95 backdrop-blur-sm text-white"
                    : item.target_type === "program"
                    ? "bg-blue-500/95 backdrop-blur-sm text-white"
                    : "bg-gray-500/95 backdrop-blur-sm text-white"
                } text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-lg`}
              >
                {item.target_type}
              </span>
            </div>
          </div>

          <div className="p-5 flex flex-col flex-grow">
            <div className="flex items-center gap-2 mb-3">
              {item.target_type === "program" && item.organization && (
                <span className="text-gray-500 text-xs font-medium truncate">
                  {item.organization}
                </span>
              )}
            </div>

            {item.description && (
              <p className="text-gray-700 text-sm mb-4 line-clamp-3 leading-relaxed">
                <AutoLinkText text={item.description} />
              </p>
            )}

            {item.target_type === "program" && item.spotsText && (
              <div className="mb-3 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-indigo-500"
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
                <span className="text-sm font-semibold text-indigo-600">
                  {item.spotsText}
                </span>
              </div>
            )}

            <div className="flex-grow" />

            {item.target_type === "program" && item.close_at && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">
                  {new Date(item.close_at).toLocaleDateString()}
                </span>
              </div>
            )}

            <button
              className={`${
                item.button_color || "bg-[#1F3A52] hover:bg-[#1a2f44]"
              } text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full`}
              onClick={() => onItemClick(item)}
            >
              {item.button_label || "View Details"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// MULTIPLE CAROUSELS AND GALLERIES
function FeaturedPrograms() {
  const { sections, loading } = useFeaturedSections();
  const navigate = useNavigate();

  const handlePrimaryClick = async (item: any) => {
    // Route logic by target type - slugs are now available from enrichment
    if (item.target_type === "org" && item.org_slug) {
      navigate(`/org/${item.org_slug}`);
      return;
    }

    if (item.target_type === "coalition" && item.coalition_slug) {
      navigate(`/coalitions/${item.coalition_slug}`);
      return;
    }

    if (item.target_type === "program") {
      // For programs, start or get application and navigate to it
      try {
        navigate(`/programs/${item.target_id}/apply`);
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
    <div className="w-full space-y-12">
      {/* All sections in intermingled order */}
      {sections.map(({ section, items }) => (
        <section key={section.id} className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {section.header}
            </h2>
          </div>
          {section.section_type === "carousel" ? (
            <HeroCarousel items={items} onItemClick={handlePrimaryClick} />
          ) : (
            <ProgramGrid items={items} onItemClick={handlePrimaryClick} />
          )}
        </section>
      ))}
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
  "bg-blue-500/95 backdrop-blur-sm text-white",
  "bg-purple-500/95 backdrop-blur-sm text-white",
  "bg-emerald-500/95 backdrop-blur-sm text-white",
  "bg-red-500/95 backdrop-blur-sm text-white",
  "bg-yellow-500/95 backdrop-blur-sm text-white",
  "bg-pink-500/95 backdrop-blur-sm text-white",
  "bg-indigo-500/95 backdrop-blur-sm text-white",
  "bg-teal-500/95 backdrop-blur-sm text-white",
];

function getGradientForIndex(index: number) {
  return gradients[index % gradients.length];
}

function getSolidColorForIndex(index: number) {
  const solidColors = [
    "bg-blue-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-red-600",
    "bg-yellow-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  return solidColors[index % solidColors.length];
}

function getTagColorForIndex(index: number) {
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
              .map((membership: any) => membership?.coalitions?.name)
              .filter((name: any) => name)
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
            solidColor: getSolidColorForIndex(index),
            tagColor: getTagColorForIndex(index),
            buttonColor: "bg-[#1F3A52] hover:bg-[#1a2f44]",
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
      <div className="mb-12 md:mb-16">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search all orgs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 pl-12 pr-4 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {filteredCorps.map((corps) => (
          <div
            key={corps.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-gray-200 overflow-hidden group flex flex-col"
          >
            <div
              className={`h-36 md:h-44 ${corps.solidColor} flex items-center justify-center relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-black/20 group-hover:from-white/5 group-hover:via-white/5 transition-all duration-500"></div>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.4),transparent_50%)]"></div>

              <h3 className="text-white text-lg md:text-xl font-bold text-center px-4 relative z-10 drop-shadow-lg leading-tight">
                {corps.name}
              </h3>

              <div className="absolute top-3 right-3">
                <span
                  className={`${corps.tagColor} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-lg backdrop-blur-sm`}
                >
                  {corps.class}
                </span>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-grow">
              <p className="text-gray-700 text-sm mb-4 line-clamp-3 leading-relaxed">
                {truncateText(corps.description, 150)}
              </p>

              <div className="flex-grow" />

              <button
                className={`${corps.buttonColor} text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full`}
                onClick={() => navigate(`/org/${corps.slug}`)}
              >
                View Details
              </button>
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

        // Filter out private programs (only show public programs)
        // Check both column and metadata (column takes precedence)
        const publicPrograms = data.filter((program: any) => {
          const columnValue = program.is_private;
          // If column is explicitly false, it's public
          if (columnValue === false) return true;
          // If column is explicitly true, it's private
          if (columnValue === true) return false;
          // If column is null/undefined, check metadata as fallback
          if (columnValue === null || columnValue === undefined) {
            return !(program.metadata as any)?.is_private;
          }
          // Default to public if we can't determine
          return true;
        });

        // Remove programs where the application deadline has passed
        const openOrUpcomingPrograms = publicPrograms.filter(
          (p: any) => !isPastDeadline(p.close_at)
        );

        // Transform database data to match the expected format
        const transformedPrograms = openOrUpcomingPrograms.map(
          (program, index) => {
            const org = program.organizations;
            const coalitionMemberships = org?.coalition_memberships || [];
            const opensSoon = isBeforeOpenDate(program.open_at);

            let coalitionDisplay;
            if (coalitionMemberships.length === 0) {
              coalitionDisplay = "Independent";
            } else if (coalitionMemberships.length === 1) {
              coalitionDisplay =
                coalitionMemberships[0]?.coalitions?.name ||
                "Unknown Coalition";
            } else {
              const coalitionNames = coalitionMemberships
                .map((membership: any) => membership?.coalitions?.name)
                .filter((name: any) => name)
                .slice(0, 2);

              if (coalitionNames.length === 2) {
                coalitionDisplay = `${coalitionNames[0]}, ${coalitionNames[1]}`;
              } else {
                coalitionDisplay = `${coalitionNames[0]} +${
                  coalitionMemberships.length - 1
                }`;
              }
            }

            // Format spots display
            let spotsText: string | null = null;
            if (program.spots_mode === "unlimited") {
              spotsText = "Unlimited spots";
            } else if (
              program.spots_mode === "exact" &&
              program.spots_count !== null &&
              program.spots_count !== undefined
            ) {
              spotsText = `${program.spots_count} spot${
                program.spots_count !== 1 ? "s" : ""
              } available`;
            }
            // TBD mode shows nothing (spotsText remains null)

            return {
              id: program.id,
              name: program.name,
              slug: program.slug,
              type: program.type,
              organization: org?.name || "Unknown Organization",
              organizationSlug: org?.slug,
              class: coalitionDisplay,
              status: opensSoon
                ? "Coming Soon"
                : program.published
                ? "Open"
                : "Closed",
              statusColor: opensSoon
                ? "text-orange-600"
                : program.published
                ? "text-green-600"
                : "text-red-600",
              gradient: getGradientForIndex(index),
              solidColor: getSolidColorForIndex(index),
              tagColor: getTagColorForIndex(index),
              buttonColor: "bg-[#1F3A52] hover:bg-[#1a2f44]",
              description:
                program.description || "A great program on our platform.",
              openAt: program.open_at,
              closeAt: program.close_at,
              opensSoon,
              spotsText,
            };
          }
        );

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

  return (
    <div className="w-full px-2 md:px-0">
      {/* Search and Filter Section */}
      <div className="mb-12 md:mb-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all duration-200 p-1">
            {/* Type Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-12 px-4 text-base border-0 bg-transparent focus:outline-none cursor-pointer appearance-none pr-8 text-gray-700 font-medium"
              >
                <option value="all">All Types</option>
                <option value="application">Applications</option>
                <option value="audition">Auditions</option>
                <option value="scholarship">Scholarships</option>
                <option value="competition">Competitions</option>
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-500"
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
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-10 pr-4 text-base focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading programs...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Programs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredPrograms.map((program) => (
              <div
                key={program.id}
                className={`bg-white rounded-2xl shadow-sm transition-all duration-300 transform border-2 border-gray-200 overflow-hidden group flex flex-col ${
                  program.status === "Coming Soon"
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:shadow-2xl hover:-translate-y-2"
                }`}
              >
                <div
                  className={`h-36 md:h-44 ${program.solidColor} flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-black/20 group-hover:from-white/5 group-hover:via-white/5 transition-all duration-500"></div>
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.4),transparent_50%)]"></div>

                  <h3 className="text-white text-lg md:text-xl font-bold text-center px-4 relative z-10 drop-shadow-lg leading-tight">
                    {program.name}
                  </h3>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`${program.tagColor} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-lg backdrop-blur-sm`}
                    >
                      {program.organization}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-xs font-medium truncate capitalize">
                      {program.type}
                    </span>
                  </div>

                  {program.description && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3 leading-relaxed">
                      <AutoLinkText text={program.description} />
                    </p>
                  )}

                  {/* Spots Information */}
                  {program.spotsText && (
                    <div className="mb-3 flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-indigo-500"
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
                      <span className="text-sm font-semibold text-indigo-600">
                        {program.spotsText}
                      </span>
                    </div>
                  )}

                  <div className="flex-grow" />

                  {/* Deadline Information */}
                  {program.closeAt && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-medium">
                        {new Date(program.closeAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <button
                    className={`${
                      program.opensSoon
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : program.buttonColor
                    } text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full`}
                    onClick={async () => {
                      if (program.opensSoon) return; // Disable navigation for programs that haven't opened
                      try {
                        navigate(`/programs/${program.id}/apply`);
                      } catch (error) {
                        console.error("Failed to start application:", error);
                        alert("Could not start application. Please try again.");
                      }
                    }}
                    disabled={program.opensSoon}
                  >
                    View Details
                  </button>
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
        </>
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

      <div className="max-w-7xl mx-auto px-2 md:px-4 pt-5 pb-4 md:py-8">
        {/* Page Content */}
        {activeTab === "Featured" && <FeaturedPrograms />}
        {activeTab === "All Orgs" && <AllOrgs />}
        {activeTab === "All Programs" && <AllPrograms />}
      </div>
    </div>
  );
}

function SmartDashboard() {
  const { capabilities, loading, refresh } = useCapabilitiesContext();
  const location = useLocation();

  // Refresh capabilities when navigating TO dashboard from another page (not on initial mount)
  // This ensures we check the database each time the user visits the dashboard
  useEffect(() => {
    if (location.pathname === "/dashboard" && capabilities !== null) {
      refresh();
    }
  }, [location.pathname, capabilities, refresh]);

  // Refresh when the page becomes visible (user switches back to tab)
  // This catches changes when user returns to the tab after being away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && location.pathname === "/dashboard") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [location.pathname, refresh]);

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
    // Pass capabilities as props to avoid duplicate fetch
    return <CapabilityHub initialCapabilities={capabilities} />;
  }

  // Otherwise, show the regular dashboard for applicants
  return <Dashboard />;
}

export default SmartDashboard;
