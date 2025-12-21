"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Row = {
  application_id: string;
  program_name: string;
  applicant_name: string;
  // Allow custom decisions saved by admins
  decision: string | null;
  score: number | null;
  comments: string | null;
  already_published: boolean;
  review_finalized_at: string | null;
};

type Visibility = {
  decision: boolean;
  score: boolean;
  comments: boolean;
  customMessage?: string | null;
};

export default function PublishResultsPage() {
  const { orgSlug, programId } = useParams<{
    orgSlug: string;
    programId: string;
  }>();

  // Keep the complete set and derive filtered rows for display
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnpublished, setOnlyUnpublished] = useState(true);
  const [programName, setProgramName] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>({
    decision: true,
    score: false,
    comments: false,
    customMessage: null,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [spotsMode, setSpotsMode] = useState<string | null>(null);
  const [spotsCount, setSpotsCount] = useState<number | null>(null);

  // Spot claiming settings
  const [claimingEnabled, setClaimingEnabled] = useState<boolean>(false);
  const [claimableDecision, setClaimableDecision] = useState<string>("");

  // Modal for deadline input when publishing
  const [showDeadlineModal, setShowDeadlineModal] = useState<boolean>(false);
  const [pendingPublishAction, setPendingPublishAction] = useState<
    "all" | "selected" | null
  >(null);
  const [publishDeadline, setPublishDeadline] = useState<string>("");

  // Modal for updating existing publications without deadlines
  const [showExistingPublicationsModal, setShowExistingPublicationsModal] =
    useState<boolean>(false);
  const [existingPublicationsDeadline, setExistingPublicationsDeadline] =
    useState<string>("");
  // Track if we've already shown the modal for existing publications (per claimable decision)
  const [hasShownExistingModal, setHasShownExistingModal] =
    useState<string>("");

  // Helper: Convert datetime-local to ISO string (preserves local time intent)
  const toISOString = (datetimeLocal: string): string | null => {
    if (!datetimeLocal) return null;
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    // Create a Date object treating it as local time, then convert to ISO
    const date = new Date(datetimeLocal);
    return date.toISOString();
  };

  // All publications data for spreadsheet
  type PublicationRow = {
    publication_id: string;
    application_id: string;
    applicant_name: string;
    published_at: string;
    claim_deadline: string | null;
    spot_claimed_at: string | null;
    spot_declined_at: string | null;
    decision: string | null;
    any_publication_claimed_at: string | null;
    any_publication_declined_at: string | null;
  };
  const [allPublications, setAllPublications] = useState<PublicationRow[]>([]);
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState<string>("");

  // Prefill from program metadata right-rail reviewer config
  useEffect(() => {
    if (!programId) return;

    (async () => {
      // Use cached program metadata function to avoid redundant calls
      const { getProgramMetadata } = await import("../../lib/api");
      try {
        const prg = await getProgramMetadata(programId);
        if (prg) {
          if (prg.name !== null && prg.name !== undefined)
            setProgramName(prg.name);
          if (prg.spots_mode !== null && prg.spots_mode !== undefined)
            setSpotsMode(prg.spots_mode);
          if (prg.spots_count !== null && prg.spots_count !== undefined)
            setSpotsCount(prg.spots_count);
          const rf = prg.metadata?.reviewerForm || {};
          setVisibility((v) => ({
            decision: rf.decision ?? v.decision,
            score: rf.score ?? v.score,
            comments: rf.comments ?? v.comments,
            customMessage: null,
          }));

          // Load claiming settings
          const claiming = prg.metadata?.spotClaiming || {};
          setClaimingEnabled(claiming.enabled || false);
          setClaimableDecision(claiming.claimableDecision || "");
        }
      } catch (error) {
        console.error("Failed to load program metadata:", error);
      }
    })();
  }, [programId]);

  // Load all publications (only for claimable decision)
  const loadPublications = async () => {
    if (!programId || !claimableDecision) {
      console.log(
        `Skipping loadPublications: programId=${programId}, claimableDecision="${claimableDecision}"`
      );
      setAllPublications([]);
      return;
    }

    console.log(
      `🔍 Calling SQL with: programId=${programId}, claimableDecision="${claimableDecision}" (length: ${claimableDecision.length})`
    );

    // Load all publications with claimable decision only
    const { data: pubData, error: pubError } = await supabase.rpc(
      "get_all_publications_for_program",
      {
        p_program_id: programId,
        p_claimable_decision: claimableDecision,
      }
    );
    if (pubError) {
      console.error("❌ Error loading publications:", pubError);
      // Still set empty array so UI doesn't break
      setAllPublications([]);
    } else if (pubData) {
      const pubs = pubData as PublicationRow[];
      console.log(
        `✅ Loaded ${pubs.length} publications for decision "${claimableDecision}"`
      );
      // Debug: log all decisions returned
      const mismatches: string[] = [];
      pubs.forEach((pub, idx) => {
        const pubDecisionNorm = (pub.decision || "").toLowerCase().trim();
        const claimableNorm = (claimableDecision || "").toLowerCase().trim();
        if (pubDecisionNorm !== claimableNorm) {
          mismatches.push(
            `[${idx}] decision="${pub.decision}" (normalized: "${pubDecisionNorm}")`
          );
        }
      });
      if (mismatches.length > 0) {
        console.error(
          `🚨 SQL RETURNED ${mismatches.length} PUBLICATIONS WITH WRONG DECISION!`,
          mismatches
        );
        console.error(
          `Expected: "${claimableDecision}" (normalized: "${(
            claimableDecision || ""
          )
            .toLowerCase()
            .trim()}")`
        );
      }
      setAllPublications(pubs);
    } else {
      console.log("No publication data returned");
      setAllPublications([]);
    }
  };

  useEffect(() => {
    loadPublications();
  }, [programId, claimableDecision]);

  // Deduplicate publications: if same applicant has claimed, show only that. Otherwise show most recent.
  // Only include publications that match the claimable decision
  // Note: If a publication's decision is edited away from the claimable decision, it will disappear from this table.
  // If it's edited back to the claimable decision, it will reappear with the correct claim status
  // (because safeguard fields track claims across ALL publications for the application)
  const deduplicatedPublications = useMemo(() => {
    if (!claimableDecision) return [];

    const claimable = claimableDecision.toLowerCase().trim();

    // First, filter to only publications with matching decision (strict check)
    // This ensures publications with non-matching decisions are excluded
    const matchingPublications = allPublications.filter((pub) => {
      const pubDecision = (pub.decision || "").toLowerCase().trim();
      const matches =
        pubDecision === claimable && pubDecision !== "" && claimable !== "";
      // Debug: log mismatches
      if (!matches && pubDecision) {
        console.log(
          `Filtering out publication: decision="${pubDecision}", claimable="${claimable}"`
        );
      }
      return matches;
    });

    const byApplicant = new Map<string, PublicationRow[]>();

    // Group by applicant name
    for (const pub of matchingPublications) {
      const name = pub.applicant_name;
      if (!byApplicant.has(name)) {
        byApplicant.set(name, []);
      }
      byApplicant.get(name)!.push(pub);
    }

    // For each applicant, pick the right publication
    const result: PublicationRow[] = [];
    for (const [, pubs] of byApplicant.entries()) {
      // If any publication for this application has been claimed, show the claimed one
      // Use safeguard field to check across ALL publications for this application
      const claimed = pubs.find((p) => p.any_publication_claimed_at);
      if (claimed) {
        result.push(claimed);
      } else {
        // Check for declined status using safeguard field
        const declined = pubs.find((p) => p.any_publication_declined_at);
        if (declined) {
          result.push(declined);
        } else {
          // Otherwise, show the most recent one (they're already sorted by published_at DESC)
          result.push(pubs[0]);
        }
      }
    }

    // Sort by published_at DESC
    return result.sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }, [allPublications, claimableDecision]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_publish_queue", {
      program_id: programId,
    });
    if (!error) {
      const list = (data as Row[]) ?? [];
      setAllRows(list);
      setSelected({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [programId]);

  // Derive unique decision options from all rows (supports custom decisions)
  const decisionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) if (r.decision) set.add(r.decision);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  // Apply filters
  const rows = useMemo(() => {
    let list = onlyUnpublished
      ? allRows.filter((r) => !r.already_published)
      : allRows;
    if (decisionFilter !== "all") {
      list = list.filter(
        (r) => (r.decision ?? "").toLowerCase() === decisionFilter.toLowerCase()
      );
    }
    return list;
  }, [allRows, onlyUnpublished, decisionFilter]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  // Toolbar state helpers
  const isFiltered = useMemo(() => decisionFilter !== "all", [decisionFilter]);

  const publishAll = async () => {
    await handlePublishClick("all");
  };

  const publishSelected = async () => {
    if (selectedIds.length === 0) return;
    await handlePublishClick("selected");
  };

  const handleDeadlineModalConfirm = async () => {
    if (pendingPublishAction) {
      await confirmPublish(pendingPublishAction, publishDeadline || null);
    }
  };

  const handleExistingPublicationsDeadlineConfirm = async () => {
    if (!programId || !claimableDecision) return;

    setLoading(true);
    try {
      const deadlineISO = existingPublicationsDeadline
        ? toISOString(existingPublicationsDeadline)
        : null;

      // Get fresh publication data to find ones without deadlines
      const { data: pubData } = await supabase.rpc(
        "get_all_publications_for_program",
        {
          p_program_id: programId,
          p_claimable_decision: claimableDecision,
        }
      );

      if (!pubData) {
        alert("Failed to load publications");
        return;
      }

      // Find all publications for the claimable decision without deadlines
      const publicationsToUpdate = pubData.filter(
        (pub: PublicationRow) =>
          (pub.decision || "").toLowerCase().trim() ===
            claimableDecision.toLowerCase().trim() && !pub.claim_deadline
      );

      // Update each publication's deadline
      for (const pub of publicationsToUpdate) {
        const { error } = await supabase.rpc("update_publication_deadline", {
          p_publication_id: pub.publication_id,
          p_deadline: deadlineISO,
        });

        if (error) {
          console.error(
            `Failed to update deadline for publication ${pub.publication_id}:`,
            error
          );
        }
      }

      // Reload publications to reflect the changes
      await loadPublications();

      setShowExistingPublicationsModal(false);
      setExistingPublicationsDeadline("");

      if (deadlineISO) {
        alert(
          `Updated deadline for ${publicationsToUpdate.length} existing publication(s).`
        );
      } else {
        alert(
          `Left ${publicationsToUpdate.length} existing publication(s) without a deadline.`
        );
      }
    } catch (error: any) {
      alert(
        error.message || "Failed to update deadlines for existing publications"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveClaimingSettings = async () => {
    if (!programId) return;

    const { data: prg } = await supabase
      .from("programs")
      .select("metadata")
      .eq("id", programId)
      .single();

    if (!prg) return;

    const metadata = prg.metadata || {};
    const spotClaiming = {
      enabled: claimingEnabled,
      claimableDecision: claimableDecision,
      allowDecline: true, // Always allow decline responses
    };

    const { error } = await supabase
      .from("programs")
      .update({
        metadata: {
          ...metadata,
          spotClaiming,
        },
      })
      .eq("id", programId);

    if (error) {
      alert("Failed to save claiming settings: " + error.message);
    } else {
      alert("Claiming settings saved!");

      // After saving, reload publications to check for existing ones without deadlines
      // Only check if claiming is enabled and a decision is selected
      if (claimingEnabled && claimableDecision) {
        // Reload publications and then check
        const { data: pubData } = await supabase.rpc(
          "get_all_publications_for_program",
          {
            p_program_id: programId,
            p_claimable_decision: claimableDecision,
          }
        );

        if (pubData && pubData.length > 0) {
          const publicationsWithoutDeadlines = pubData.filter(
            (pub: PublicationRow) =>
              (pub.decision || "").toLowerCase().trim() ===
                claimableDecision.toLowerCase().trim() && !pub.claim_deadline
          );

          // Create a unique key for this decision to track if we've shown the modal
          const modalKey = `${programId}-${claimableDecision}`;

          if (
            publicationsWithoutDeadlines.length > 0 &&
            hasShownExistingModal !== modalKey
          ) {
            // Show modal to set deadline for existing publications
            setShowExistingPublicationsModal(true);
            setHasShownExistingModal(modalKey);
          }
        }

        // Reload publications for the UI
        await loadPublications();
      }
    }
  };

  const confirmPublish = async (
    action: "all" | "selected",
    deadline?: string | null
  ) => {
    setLoading(true);

    try {
      const claimDeadlineISO = deadline ? toISOString(deadline) : null;

      if (action === "all") {
        const { data, error } = await supabase.rpc(
          "publish_all_finalized_for_program_v1",
          {
            p_program_id: programId,
            p_visibility: visibility,
            p_only_unpublished: onlyUnpublished,
            p_claim_deadline: claimDeadlineISO,
          }
        );
        if (error) throw error;
        alert(`Published ${data?.length ?? 0} finalized result(s).`);
      } else if (action === "selected") {
        const { data, error } = await supabase.rpc("publish_results_v1", {
          p_application_ids: selectedIds,
          p_visibility: visibility,
          p_claim_deadline: claimDeadlineISO,
        });
        if (error) throw error;
        alert(`Published ${data?.length ?? 0} selected result(s).`);
      }
      load();
      // Reload publications
      await loadPublications();
    } catch (error: any) {
      alert(error.message || "Failed to publish results");
    } finally {
      setLoading(false);
      setShowDeadlineModal(false);
      setPendingPublishAction(null);
      setPublishDeadline("");
    }
  };

  const handlePublishClick = async (action: "all" | "selected") => {
    // Check if claiming is enabled and if any selected rows have the claimable decision
    if (claimingEnabled && claimableDecision) {
      let hasClaimableDecision = false;

      if (action === "all") {
        // For "all", check if any row in the filtered list has the claimable decision
        hasClaimableDecision = rows.some(
          (r) =>
            (r.decision ?? "").toLowerCase() === claimableDecision.toLowerCase()
        );
      } else {
        // For "selected", check if any selected row has the claimable decision
        hasClaimableDecision = rows
          .filter((r) => selected[r.application_id])
          .some(
            (r) =>
              (r.decision ?? "").toLowerCase() ===
              claimableDecision.toLowerCase()
          );
      }

      if (hasClaimableDecision) {
        // Show modal to set deadline
        setPendingPublishAction(action);
        setShowDeadlineModal(true);
        return;
      }
    }

    // No claimable decision in selection, proceed without deadline
    await confirmPublish(action, null);
  };

  // Helper: Convert ISO string to datetime-local format
  const toDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Format as YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const startEditingDeadline = (
    pubId: string,
    currentDeadline: string | null
  ) => {
    setEditingDeadline(pubId);
    setEditingDeadlineValue(toDateTimeLocal(currentDeadline));
  };

  const cancelEditingDeadline = () => {
    setEditingDeadline(null);
    setEditingDeadlineValue("");
  };

  const saveDeadline = async (pubId: string) => {
    const deadlineISO = editingDeadlineValue
      ? toISOString(editingDeadlineValue)
      : null;

    // Use RPC function (SECURITY DEFINER bypasses RLS)
    const { error } = await supabase.rpc("update_publication_deadline", {
      p_publication_id: pubId,
      p_deadline: deadlineISO,
    });

    if (error) {
      alert("Failed to update deadline: " + error.message);
    } else {
      // Reload publications
      await loadPublications();
      setEditingDeadline(null);
      setEditingDeadlineValue("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start space-y-3 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Publish Results - <span className="font-normal">{programName}</span>
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage and publish application results for your program
          </p>
        </div>
        <Link
          to={`/org/${orgSlug}/admin/publish-results`}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Back to Gallery
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  Results Queue
                </h2>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                {decisionOptions.length > 0 && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                    <span className="hidden sm:inline text-gray-600">
                      Decisions
                    </span>
                    <div className="relative">
                      <select
                        value={decisionFilter}
                        onChange={(e) => {
                          setDecisionFilter(e.target.value);
                          setSelected({});
                        }}
                        className="appearance-none border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
                      >
                        <option value="all">All decisions</option>
                        {decisionOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        ▾
                      </span>
                    </div>
                    {decisionFilter !== "all" && (
                      <button
                        onClick={() => setDecisionFilter("all")}
                        className="text-gray-500 hover:text-gray-700 rounded px-2 py-1"
                        title="Clear filter"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <div className="hidden md:block h-6 w-px bg-gray-200" />
                <label className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={onlyUnpublished}
                    onChange={(e) => {
                      setOnlyUnpublished(e.target.checked);
                      setSelected({});
                    }}
                    className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Unpublished only
                </label>
                <div className="hidden md:block h-6 w-px bg-gray-200" />
                {selectedIds.length > 0 || isFiltered ? (
                  <button
                    onClick={publishSelected}
                    disabled={loading || selectedIds.length === 0}
                    className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      `Publish selected (${selectedIds.length})`
                    )}
                  </button>
                ) : (
                  <button
                    onClick={publishAll}
                    disabled={loading || rows.length === 0}
                    className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      "Publish all finalized"
                    )}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading results...</p>
              </div>
            ) : rows.length === 0 ? (
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
                  No results to publish
                </h3>
                <p className="mt-2 text-gray-500">
                  {onlyUnpublished
                    ? "No unpublished finalized reviews found."
                    : "No finalized reviews found for this program."}
                </p>
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const all = Object.fromEntries(
                              rows.map((r) => [
                                r.application_id,
                                e.target.checked,
                              ])
                            );
                            setSelected(all);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Decision
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comments
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finalized
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Published
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((r) => (
                      <tr key={r.application_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected[r.application_id]}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [r.application_id]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate">
                          {r.applicant_name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.decision ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                r.decision === "accept"
                                  ? "bg-green-100 text-green-800"
                                  : r.decision === "waitlist"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {r.decision}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {r.score ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[280px]">
                          <div className="truncate" title={r.comments ?? ""}>
                            {r.comments
                              ? (() => {
                                  const words = r.comments.split(" ");
                                  return words.length > 4
                                    ? words.slice(0, 4).join(" ") + "..."
                                    : r.comments;
                                })()
                              : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {r.review_finalized_at
                            ? new Date(
                                r.review_finalized_at
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              r.already_published
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {r.already_published ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rows.length > 0 && (
              <div className="mt-5 md:mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{selectedIds.length}</span> of{" "}
                  {rows.length} selected
                </div>
                <button
                  onClick={publishSelected}
                  disabled={loading || selectedIds.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    `Publish selected (${selectedIds.length})`
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Spot Claiming Status */}
          {claimingEnabled && claimableDecision && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Spot Claiming Status
              </h3>

              {/* Claiming Configuration Info */}
              <div className="mb-6 p-3 bg-gray-50 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Decision:</span>{" "}
                    <span className="font-semibold">{claimableDecision}</span>
                  </p>
                  {spotsMode === "exact" && spotsCount !== null && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Remaining spots:</span>{" "}
                      <span className="font-semibold">{spotsCount}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Publications Spreadsheet */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  All Publications ({deduplicatedPublications.length})
                </h4>
                {deduplicatedPublications.length === 0 ? (
                  <p className="text-sm text-gray-500">No publications yet.</p>
                ) : (
                  <div className="overflow-auto rounded-lg border border-gray-200 max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Applicant
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Published
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deadline
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {deduplicatedPublications.map((pub) => (
                          <tr
                            key={pub.publication_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {pub.applicant_name}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {pub.published_at
                                ? new Date(pub.published_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {editingDeadline === pub.publication_id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="datetime-local"
                                    value={editingDeadlineValue}
                                    onChange={(e) =>
                                      setEditingDeadlineValue(e.target.value)
                                    }
                                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() =>
                                      saveDeadline(pub.publication_id)
                                    }
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingDeadline}
                                    className="text-gray-600 hover:text-gray-800 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-900">
                                    {pub.claim_deadline
                                      ? new Date(
                                          pub.claim_deadline
                                        ).toLocaleString()
                                      : "—"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      startEditingDeadline(
                                        pub.publication_id,
                                        pub.claim_deadline
                                      )
                                    }
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Edit deadline"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {(() => {
                                // STRICT CHECK: Only show status if decision matches claimable decision exactly
                                const pubDecision = (pub.decision || "")
                                  .toLowerCase()
                                  .trim();
                                const claimable = (claimableDecision || "")
                                  .toLowerCase()
                                  .trim();

                                // Debug: log mismatches
                                if (pubDecision !== claimable) {
                                  console.log(
                                    `Status label check: pub.decision="${pub.decision}" (normalized: "${pubDecision}"), claimable="${claimableDecision}" (normalized: "${claimable}") - showing "—"`
                                  );
                                }

                                // If decision doesn't match OR is empty, show nothing
                                if (
                                  !pubDecision ||
                                  !claimable ||
                                  pubDecision !== claimable
                                ) {
                                  return (
                                    <span className="text-gray-400 text-sm">
                                      —
                                    </span>
                                  );
                                }

                                // DOUBLE CHECK: Ensure decision still matches before showing any label
                                // (This is a safety check in case data changed)
                                const finalCheck =
                                  (pub.decision || "").toLowerCase().trim() ===
                                  claimable;
                                if (!finalCheck) {
                                  console.error(
                                    `CRITICAL: Attempted to show label for non-matching decision! pub.decision="${pub.decision}", claimable="${claimableDecision}"`
                                  );
                                  return (
                                    <span className="text-gray-400 text-sm">
                                      —
                                    </span>
                                  );
                                }

                                // Use safeguard fields to check if ANY publication for this application has been claimed/declined
                                // This ensures we show the correct status even if claim was made on a different publication
                                const anyClaimed =
                                  !!pub.any_publication_claimed_at;
                                const anyDeclined =
                                  !!pub.any_publication_declined_at;

                                // Only show status labels for matching decisions
                                if (anyClaimed) {
                                  return (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Claimed
                                    </span>
                                  );
                                } else if (anyDeclined) {
                                  return (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Declined
                                    </span>
                                  );
                                } else if (
                                  pub.claim_deadline &&
                                  new Date(pub.claim_deadline) < new Date()
                                ) {
                                  return (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      Missed
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-400 text-sm">
                                      Pending
                                    </span>
                                  );
                                }
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What to send
            </h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.decision}
                    onChange={(e) =>
                      setVisibility((v) => ({
                        ...v,
                        decision: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Decision</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.score}
                    onChange={(e) =>
                      setVisibility((v) => ({ ...v, score: e.target.checked }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Score</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.comments}
                    onChange={(e) =>
                      setVisibility((v) => ({
                        ...v,
                        comments: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Reviewer comments</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optional custom message
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add a custom message to include with the results..."
                  value={visibility.customMessage ?? ""}
                  onChange={(e) =>
                    setVisibility((v) => ({
                      ...v,
                      customMessage: e.target.value || null,
                    }))
                  }
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be included with all published results.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={claimingEnabled}
                    onChange={(e) => setClaimingEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable spot claiming
                  </span>
                </label>

                {claimingEnabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Which decision can claim spots?
                      </label>
                      <select
                        value={claimableDecision}
                        onChange={(e) => setClaimableDecision(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a decision...</option>
                        {decisionOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={saveClaimingSettings}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Claiming Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Set Claim Deadline
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You're publishing results with the "{claimableDecision}" decision.
              Set a deadline for applicants to claim their spots (optional).
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={publishDeadline}
                onChange={(e) => setPublishDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to keep claiming open until spots are full
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeadlineModal(false);
                  setPendingPublishAction(null);
                  setPublishDeadline("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeadlineModalConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Publications Deadline Modal */}
      {showExistingPublicationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Set Deadline for Existing Publications
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You've enabled spot claiming for the "{claimableDecision}"
              decision, and there are already published results without a
              deadline. Set a deadline for these existing publications
              (optional).
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={existingPublicationsDeadline}
                onChange={(e) =>
                  setExistingPublicationsDeadline(e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to keep claiming open until spots are full
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowExistingPublicationsModal(false);
                  setExistingPublicationsDeadline("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Skip
              </button>
              <button
                onClick={handleExistingPublicationsDeadlineConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Set Deadline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
