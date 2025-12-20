"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import AutoLinkText from "../../components/AutoLinkText";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";

type ResultsRow = {
  application_id: string;
  program_id: string;
  program_name: string;
  publication_id: string;
  published_at: string;
  visibility: {
    decision: boolean;
    score: boolean;
    comments: boolean;
    customMessage?: string | null;
  };
  payload: {
    decision?: string | null;
    score?: number | null;
    comments?: string | null;
  };
  spot_claimed_at?: string | null;
  spot_declined_at?: string | null;
  claim_deadline?: string | null;
};

type ApplicationRow = {
  id: string;
  program_id: string;
  user_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  created_at: string;
  updated_at: string;
  programs: {
    name: string;
    organization_id: string;
    organizations: {
      name: string;
    };
  };
};

export default function MySubmissionsPage() {
  const [activeTab, setActiveTab] = useState<"applications" | "results">(
    "applications"
  );
  const [resultsRows, setResultsRows] = useState<ResultsRow[]>([]);
  const [applicationsRows, setApplicationsRows] = useState<ApplicationRow[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [claimingLoading, setClaimingLoading] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { hasUnread } = useUnreadNotifications();
  
  // Store program claiming configs (deadline is now per-publication, not per-program)
  const [programClaimingConfigs, setProgramClaimingConfigs] = useState<Record<string, {
    enabled: boolean;
    claimableDecision: string;
    allowDecline: boolean;
    spotsCount: number | null;
    spotsMode: string | null;
  }>>({});

  const refreshResults = async () => {
    const { data, error } = await supabase.rpc("get_published_results_v1");
    if (!error && data) {
      const allPubs = (data ?? []) as ResultsRow[];
      
      // Deduplicate: show only the most recent publication per application
      // Group by application_id and pick the one with the latest published_at
      const byApplication = new Map<string, ResultsRow>();
      for (const pub of allPubs) {
        const existing = byApplication.get(pub.application_id);
        if (!existing || new Date(pub.published_at) > new Date(existing.published_at)) {
          byApplication.set(pub.application_id, pub);
        }
      }
      
      // Convert back to array (most recent first)
      const deduplicated = Array.from(byApplication.values()).sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
      
      setResultsRows(deduplicated);
      
      // Load claiming configs for each program (use deduplicated data)
      const programIds = [...new Set(deduplicated.map(r => r.program_id))] as string[];
      const configs: Record<string, any> = {};
      
      for (const pid of programIds) {
        const { data: prg } = await supabase
          .from("programs")
          .select("metadata, spots_mode, spots_count")
          .eq("id", pid)
          .single();
        
        if (prg) {
          const claiming = prg.metadata?.spotClaiming || {};
          configs[pid] = {
            enabled: claiming.enabled || false,
            claimableDecision: claiming.claimableDecision || "",
            allowDecline: claiming.allowDecline !== false,
            spotsCount: prg.spots_count,
            spotsMode: prg.spots_mode,
          };
        }
      }
      
      setProgramClaimingConfigs(configs);
    }
  };
  
  const handleClaimOrDecline = async (publicationId: string, action: "claim" | "decline") => {
    setClaimingLoading((prev) => ({ ...prev, [publicationId]: true }));
    
    try {
      const { data, error } = await supabase.rpc("claim_or_decline_spot", {
        p_publication_id: publicationId,
        p_action: action,
      });
      
      if (error) throw error;
      
      // Refresh results to get updated status
      await refreshResults();
      
      if (action === "claim") {
        alert("✅ Your spot has been claimed!");
      } else {
        alert("You have declined this offer.");
      }
    } catch (error: any) {
      alert(error.message || `Failed to ${action} spot`);
    } finally {
      setClaimingLoading((prev) => ({ ...prev, [publicationId]: false }));
    }
  };

  const refreshApplications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          program_id,
          user_id,
          status,
          created_at,
          updated_at,
          programs!inner(name, organization_id, organizations(name))
        `
        )
        .eq("user_id", user.id)
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
      } else {
        setApplicationsRows((data ?? []) as any[]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (!user?.id) return;
    
    // Parallelize both refresh calls
    Promise.all([refreshResults(), refreshApplications()]);
  }, [user?.id]); // Only re-run when user changes, not on tab change

  // Mark notifications as read when switching to Results tab (separate effect)
  useEffect(() => {
    if (!user?.id || activeTab !== "results") return;

    // Single UPDATE query marks all unread notifications at once
    const markAsRead = async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      
      if (error) {
        console.error("Error marking notifications as read:", error);
      }
    };

    markAsRead();
  }, [user?.id, activeTab]); // Only when switching to results tab

  // Realtime subscription for new results (set up once)
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: NodeJS.Timeout;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshResults();
      }, 500); // Debounce to prevent rapid-fire calls
    };

    const channel = supabase
      .channel("notif")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "type=eq.results_published",
        },
        debouncedRefresh
      )
      .subscribe();
      
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Only set up once per user

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "waitlisted":
        return "bg-orange-100 text-orange-800";
      case "results_released":
        return "bg-purple-100 text-purple-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            My Submissions
          </h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
            View your submitted applications and their results
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg
            className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="-mb-px flex space-x-4 md:space-x-8 px-3 md:px-6">
          <button
            onClick={() => setActiveTab("applications")}
            className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors duration-200 ${
              activeTab === "applications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`relative py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors duration-200 ${
              activeTab === "results"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Results
            {hasUnread && (
              <span className="absolute -top-0.5 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white shadow-md animate-pulse"></span>
            )}
          </button>
        </nav>
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div className="bg-white rounded-b-lg shadow-sm">
          <div className="p-3 md:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading applications...</p>
              </div>
            ) : applicationsRows.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No applications yet
                </h3>
                <p className="mt-2 text-gray-500">
                  You haven't submitted any applications yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {applicationsRows.map((app) => {
                  // Check if results are published for this application
                  const hasResults = resultsRows.some(
                    (r) => r.application_id === app.id
                  );
                  const displayStatus = hasResults ? "results_released" : app.status;
                  
                  return (
                    <div
                      key={app.id}
                      className="group border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-3 md:space-y-0">
                        <div className="flex-1">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {app.programs.name}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-600 mt-1">
                            {app.programs.organizations.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted: {new Date(app.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                          <span
                            className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(
                              displayStatus
                            )}`}
                          >
                            {displayStatus === "results_released"
                              ? "Results Released"
                              : displayStatus.charAt(0).toUpperCase() +
                                displayStatus.slice(1)}
                          </span>
                          <Link
                            to={`/programs/${app.program_id}/apply`}
                            className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                          >
                            View Application
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <div className="bg-white rounded-b-lg shadow-sm">
          <div className="p-3 md:p-6">
            {resultsRows.length === 0 ? (
              <div className="text-center py-12 md:py-16">
                <div className="mx-auto h-16 w-16 md:h-24 md:w-24 text-gray-300 mb-4 md:mb-6">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-full h-full"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                  No results at this time
                </h3>
                <p className="text-sm md:text-lg text-gray-500 max-w-md mx-auto">
                  Your application results will appear here once they are
                  published by the organization.
                </p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {resultsRows
                  .sort(
                    (a, b) =>
                      new Date(b.published_at).getTime() -
                      new Date(a.published_at).getTime()
                  )
                  .map((r) => {
                    const v = r.visibility;
                    const p = r.payload || {};
                    const config = programClaimingConfigs[r.program_id];
                    const decision = (p.decision || "").toLowerCase();
                    const claimableDecision = (config?.claimableDecision || "").toLowerCase();
                    const decisionMatches = decision === claimableDecision;
                    
                    // Only check publications that match the claimable decision
                    // Filter to publications with matching decision first
                    const programResults = resultsRows.filter(rr => {
                      if (rr.program_id !== r.program_id) return false;
                      const pubDecision = ((rr.payload?.decision || "") as string).toLowerCase();
                      return pubDecision === claimableDecision;
                    });
                    
                    // Check if any matching publication has been claimed/declined
                    const anyClaimed = programResults.some(rr => !!rr.spot_claimed_at);
                    const anyDeclined = programResults.some(rr => !!rr.spot_declined_at);
                    const claimedPublication = programResults.find(rr => !!rr.spot_claimed_at);
                    const declinedPublication = programResults.find(rr => !!rr.spot_declined_at);
                    
                    // Only show claimed/declined status if THIS publication's decision matches
                    const isClaimed = decisionMatches && anyClaimed;
                    const isDeclined = decisionMatches && anyDeclined;
                    const canClaim = config?.enabled && 
                                     decisionMatches && 
                                     !isClaimed && 
                                     !isDeclined;
                    // Use publication's deadline (per-publication, not program-level)
                    const deadline = r.claim_deadline ? new Date(r.claim_deadline) : null;
                    const deadlinePassed = deadline ? new Date() > deadline : false;
                    const spotsAvailable = config?.spotsMode !== "exact" || (config?.spotsCount ?? 0) > 0;
                    const showClaimButtons = canClaim && !deadlinePassed && spotsAvailable;
                    // Only show deadline-related messages if decision matches claimable decision
                    const showDeadlineMessage = config?.enabled && decisionMatches && deadlinePassed && !isClaimed && !isDeclined;
                    
                    return (
                      <div
                        key={r.publication_id}
                        className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-start mb-3 md:mb-4">
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-gray-900">
                              {r.program_name}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                              Published:{" "}
                              {new Date(r.published_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {v.decision && p.decision && (
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-purple-700 mb-1">
                                Decision
                              </div>
                              <div className="text-lg font-semibold text-purple-900 capitalize">
                                {p.decision}
                              </div>
                            </div>
                          )}
                          {v.score && p.score !== null && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-blue-800 mb-1">
                                Score
                              </div>
                              <div className="text-lg font-semibold text-blue-900">
                                {p.score}
                              </div>
                            </div>
                          )}
                          {v.comments && p.comments && (
                            <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-800 mb-2">
                                Reviewer Comments:
                              </div>
                              <div className="text-gray-700 leading-relaxed">
                                <AutoLinkText text={p.comments} preserveWhitespace={true} />
                              </div>
                            </div>
                          )}
                        </div>

                        {v.customMessage && (
                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-amber-800 mb-1">
                              Additional Message
                            </div>
                            <div className="text-amber-700">
                              <AutoLinkText text={v.customMessage} preserveWhitespace={true} />
                            </div>
                          </div>
                        )}
                        
                        {/* Spot Claiming Section */}
                        {/* Only show claiming section if decision matches claimable decision */}
                        {config?.enabled && decisionMatches && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {isClaimed ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-green-600 font-semibold">✅ Spot Claimed</span>
                                </div>
                                <p className="text-sm text-green-700">
                                  Your spot was successfully claimed on {claimedPublication ? new Date(claimedPublication.spot_claimed_at!).toLocaleString() : '—'}
                                </p>
                              </div>
                            ) : isDeclined ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                  You declined this offer on {declinedPublication ? new Date(declinedPublication.spot_declined_at!).toLocaleString() : '—'}
                                </p>
                              </div>
                            ) : showDeadlineMessage ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                  ⏰ Time has run out. The deadline to claim your spot has passed.
                                </p>
                              </div>
                            ) : !spotsAvailable && decisionMatches ? (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-700">
                                  ❌ No spots available. All spots have been claimed.
                                </p>
                              </div>
                            ) : showClaimButtons ? (
                              <div className="space-y-3">
                                {deadline && (
                                  <p className="text-xs text-gray-600">
                                    Claim by: {deadline.toLocaleString()} 
                                    ({Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)
                                  </p>
                                )}
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleClaimOrDecline(r.publication_id, "claim")}
                                    disabled={claimingLoading[r.publication_id]}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                  >
                                    {claimingLoading[r.publication_id] ? "Processing..." : "Claim My Spot"}
                                  </button>
                                  {config.allowDecline && (
                                    <button
                                      onClick={() => handleClaimOrDecline(r.publication_id, "decline")}
                                      disabled={claimingLoading[r.publication_id]}
                                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                      {claimingLoading[r.publication_id] ? "Processing..." : "Decline Offer"}
                                    </button>
                                  )}
                                </div>
                                {config.spotsMode === "exact" && config.spotsCount !== null && (
                                  <p className="text-xs text-gray-500">
                                    Remaining spots: {config.spotsCount}
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
