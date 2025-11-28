import { useEffect, useMemo, useState } from "react";
import { submitForm } from "../services/forms";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

type DurationPreset = "7d" | "14d" | "30d" | "until_deadline" | "custom";

type ProgramOption = {
  id: string;
  name: string;
  deleted_at?: string | null;
  close_at?: string | null;
};

interface AdvertiseFormModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  orgName: string | null;
  orgSlug?: string | null;
}

const presetLabels: Record<DurationPreset, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  until_deadline: "Until deadline",
  custom: "Custom",
};

const presetToDays = (preset: DurationPreset) => {
  if (preset === "custom" || preset === "until_deadline") return null;
  return Number(preset.replace("d", ""));
};

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format date as MM/DD/YYYY (matching super admin Forms page)
const formatDateDisplay = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  // Extract date portion from ISO string to avoid timezone issues
  const dateOnly = dateStr.split("T")[0];
  const [year, month, day] = dateOnly.split("-");
  return `${month}/${day}/${year}`;
};

const addDaysToDateInput = (input: string, days: number) => {
  if (!input) return "";
  const base = new Date(input);
  base.setDate(base.getDate() + days);
  return formatDateLocal(base);
};

const toIsoString = (input: string) => {
  if (!input) return null;
  // For date-only inputs (YYYY-MM-DD), convert to ISO string at midnight UTC
  // This ensures the date doesn't shift due to timezone conversion
  // Input format: "YYYY-MM-DD"
  return `${input}T00:00:00.000Z`;
};

// Pricing structure - longer commitments get better per-day rates
const ORG_PRICING = {
  daily: 2, // $2.00/day
  weekly: 10, // 7 days = $1.43/day (28% savings)
  biweekly: 18, // 14 days = $1.29/day (36% savings)
  monthly: 35, // 30 days = $1.17/day (42% savings)
};

const PROGRAM_PRICING = {
  daily: 1, // $1.00/day
  weekly: 6, // 7 days = $0.86/day (14% savings)
  biweekly: 11, // 14 days = $0.79/day (21% savings)
  monthly: 20, // 30 days = $0.67/day (33% savings)
};

const calculatePrice = (
  type: "org" | "program",
  durationPreset: DurationPreset,
  showFrom: string,
  hideAfter: string
): number => {
  const pricing = type === "org" ? ORG_PRICING : PROGRAM_PRICING;

  if (durationPreset === "custom" || durationPreset === "until_deadline") {
    if (!showFrom || !hideAfter) return 0;
    const start = new Date(showFrom);
    const end = new Date(hideAfter);
    // Add 1 to make it inclusive (both start and end dates count)
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return pricing.daily * days;
  }

  switch (durationPreset) {
    case "7d":
      return pricing.weekly;
    case "14d":
      return pricing.biweekly;
    case "30d":
      return pricing.monthly;
    default:
      return 0;
  }
};

// Calculate price for a specific program when "until_deadline" is selected
const calculateProgramPriceUntilDeadline = (
  showFrom: string,
  programDeadline: string | null | undefined
): number => {
  if (!showFrom || !programDeadline) return 0;

  // Extract date components to avoid timezone issues
  // showFrom is in YYYY-MM-DD format (e.g., "2025-11-24")
  const startDateStr = showFrom.includes("T")
    ? showFrom.split("T")[0]
    : showFrom;

  // programDeadline might be ISO string - we need to get the LOCAL date, not UTC date
  // Create a date object from the deadline, then extract the local date components
  const deadlineDate = new Date(programDeadline);

  // Get the local date components (not UTC) to match the user's calendar date
  const endYear = deadlineDate.getFullYear();
  const endMonth = deadlineDate.getMonth() + 1; // getMonth() returns 0-11
  const endDay = deadlineDate.getDate();

  // Parse start date components
  const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);

  // Compare as calendar dates (year, month, day) - not timestamps
  // This ensures same-day deadlines are calculated as 1 day
  if (startYear === endYear && startMonth === endMonth && startDay === endDay) {
    // Same calendar day = 1 day
    return PROGRAM_PRICING.daily * 1;
  }

  // Different days - calculate the difference
  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  // Calculate days difference (inclusive of both start and end dates)
  const days =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  // Ensure minimum of 1 day
  const finalDays = Math.max(1, days);
  return PROGRAM_PRICING.daily * finalDays;
};

export default function AdvertiseFormModal({
  open,
  onClose,
  orgId,
  orgName,
  orgSlug,
}: AdvertiseFormModalProps) {
  const { user } = useAuth();
  const [showFrom, setShowFrom] = useState("");
  const [hideAfter, setHideAfter] = useState("");
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("7d");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Feature type selection: can select both org and programs
  const [selectedOrg, setSelectedOrg] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState(false);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programLoadError, setProgramLoadError] = useState<string | null>(null);
  const [programSearch, setProgramSearch] = useState("");
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(
    new Set()
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<"form" | "log">("form");

  // Request log state
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const isOrgReady = Boolean(orgId && orgName);

  // Fetch organization's advertisement requests
  const loadRequests = async () => {
    if (!orgId) return;
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const { data, error } = await supabase.rpc(
        "org_list_advertise_requests_v1",
        {
          p_org_id: orgId,
        }
      );

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to load requests", err);
      setRequestsError(
        err instanceof Error ? err.message : "Failed to load requests"
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    const formatted = formatDateLocal(today);
    setShowFrom(formatted);
    setDurationPreset("7d");
    setHideAfter(addDaysToDateInput(formatted, 7));
    setNotes("");
    setError(null);
    setSuccess(false);
    setSelectedOrg(false);
    setSelectedPrograms(false);
    setProgramSearch("");
    setSelectedProgramIds(new Set());
    setProgramLoadError(null);
    setActiveTab("form");
  }, [open]);

  // Load requests when log tab is active
  useEffect(() => {
    if (open && activeTab === "log" && orgId) {
      loadRequests();
    }
  }, [open, activeTab, orgId]);

  // Uncheck organization when until_deadline is selected (orgs don't have deadlines)
  useEffect(() => {
    if (durationPreset === "until_deadline" && selectedOrg) {
      setSelectedOrg(false);
    }
  }, [durationPreset]);

  // Deselect programs without deadlines or with past deadlines when until_deadline is selected
  // This runs when durationPreset changes to "until_deadline" or when programs are loaded
  useEffect(() => {
    if (durationPreset === "until_deadline" && programs.length > 0) {
      setSelectedProgramIds((prevIds) => {
        if (prevIds.size === 0) return prevIds;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validProgramIds = new Set<string>();

        programs.forEach((p) => {
          if (prevIds.has(p.id) && p.close_at) {
            const deadline = new Date(p.close_at);
            deadline.setHours(0, 0, 0, 0);
            if (deadline >= today) {
              validProgramIds.add(p.id);
            }
          }
        });

        // Only return new set if there are changes
        if (
          validProgramIds.size === prevIds.size &&
          Array.from(prevIds).every((id) => validProgramIds.has(id))
        ) {
          return prevIds; // No changes
        }
        return validProgramIds;
      });
    }
  }, [durationPreset, programs]);

  // Auto-calculate hideAfter when preset changes (unless custom)
  useEffect(() => {
    if (!open || durationPreset === "custom") return;

    if (durationPreset === "until_deadline") {
      // Find earliest future deadline among selected programs
      if (selectedProgramIds.size > 0 && showFrom) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedProgramsData = programs.filter((p) =>
          selectedProgramIds.has(p.id)
        );
        const deadlines = selectedProgramsData
          .map((p) => {
            if (!p.close_at) return null;
            const deadline = new Date(p.close_at);
            deadline.setHours(0, 0, 0, 0);
            return deadline >= today ? deadline : null;
          })
          .filter((date): date is Date => date !== null);

        if (deadlines.length > 0) {
          const earliestDeadline = new Date(
            Math.min(...deadlines.map((d) => d.getTime()))
          );
          setHideAfter(formatDateLocal(earliestDeadline));
        }
      }
      return;
    }

    const days = presetToDays(durationPreset);
    if (days && showFrom) {
      setHideAfter(addDaysToDateInput(showFrom, days));
    }
  }, [showFrom, durationPreset, open, selectedProgramIds, programs]);

  // Load programs when "programs" option is selected
  useEffect(() => {
    if (!open || !orgId || !selectedPrograms) return;
    let mounted = true;
    const loadPrograms = async () => {
      try {
        setProgramsLoading(true);
        setProgramLoadError(null);
        const { data, error } = await supabase
          .from("programs")
          .select("id,name,deleted_at,is_private,close_at")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .or("is_private.is.null,is_private.eq.false")
          .order("name", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        setPrograms(data || []);
        if ((data || []).length === 0) {
          setProgramLoadError("No active programs found.");
        }
      } catch (err) {
        console.error("Failed to load programs", err);
        if (mounted) {
          setProgramLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load programs for this organization."
          );
        }
      } finally {
        if (mounted) setProgramsLoading(false);
      }
    };
    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [open, orgId, selectedPrograms]);

  const presetButtons = useMemo(
    () =>
      (Object.keys(presetLabels) as DurationPreset[]).map((preset) => ({
        preset,
        label: presetLabels[preset],
      })),
    []
  );

  const filteredPrograms = useMemo(() => {
    let filtered = programs;

    // When "until_deadline" is selected, only show programs with future deadlines
    if (durationPreset === "until_deadline") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
      filtered = filtered.filter((p) => {
        if (!p.close_at) return false;
        const deadline = new Date(p.close_at);
        deadline.setHours(0, 0, 0, 0);
        return deadline >= today; // Only future or today's deadlines
      });
    }

    // Apply search filter
    if (programSearch.trim()) {
      const term = programSearch.toLowerCase();
      filtered = filtered.filter((program) =>
        program.name.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [programs, programSearch, durationPreset]);

  // Check if selected programs have future deadlines (for until_deadline validation)
  const selectedProgramsHaveDeadlines = useMemo(() => {
    if (durationPreset !== "until_deadline" || selectedProgramIds.size === 0) {
      return true; // Not applicable or no programs selected
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedProgramsData = programs.filter((p) =>
      selectedProgramIds.has(p.id)
    );
    return selectedProgramsData.some((p) => {
      if (!p.close_at) return false;
      const deadline = new Date(p.close_at);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= today; // Only future or today's deadlines
    });
  }, [durationPreset, selectedProgramIds, programs]);

  const toggleProgram = (programId: string) => {
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOrgReady) {
      setError("We couldn't load your organization details.");
      return;
    }
    if (!selectedOrg && !selectedPrograms) {
      setError("Please select at least one option to feature.");
      return;
    }
    if (selectedPrograms && selectedProgramIds.size === 0) {
      setError("Please select at least one program to feature.");
      return;
    }

    // Validate until_deadline requires programs with future deadlines
    if (durationPreset === "until_deadline") {
      if (selectedProgramIds.size === 0) {
        setError("Please select at least one program with a future deadline.");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedProgramsData = programs.filter((p) =>
        selectedProgramIds.has(p.id)
      );
      const hasFutureDeadlines = selectedProgramsData.some((p) => {
        if (!p.close_at) return false;
        const deadline = new Date(p.close_at);
        deadline.setHours(0, 0, 0, 0);
        return deadline >= today;
      });
      if (!hasFutureDeadlines) {
        setError(
          "Selected programs must have future deadlines for 'Until deadline' option."
        );
        return;
      }
    }

    if (!showFrom) {
      setError("Please choose when the campaign should start.");
      return;
    }
    // Calculate hideAfter if using preset
    let finalHideAfter = hideAfter;
    if (durationPreset === "until_deadline") {
      // Calculate from earliest future deadline
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedProgramsData = programs.filter((p) =>
        selectedProgramIds.has(p.id)
      );
      const deadlines = selectedProgramsData
        .map((p) => {
          if (!p.close_at) return null;
          const deadline = new Date(p.close_at);
          deadline.setHours(0, 0, 0, 0);
          return deadline >= today ? deadline : null;
        })
        .filter((date): date is Date => date !== null);
      if (deadlines.length > 0 && showFrom) {
        const earliestDeadline = new Date(
          Math.min(...deadlines.map((d) => d.getTime()))
        );
        finalHideAfter = formatDateLocal(earliestDeadline);
      }
    } else if (durationPreset !== "custom") {
      const days = presetToDays(durationPreset);
      if (days && showFrom) {
        finalHideAfter = addDaysToDateInput(showFrom, days);
      }
    }

    if (durationPreset === "custom") {
      if (!hideAfter) {
        setError("Please choose when the campaign should end.");
        return;
      }
      if (new Date(hideAfter) <= new Date(showFrom)) {
        setError("End date must be later than the start date.");
        return;
      }
    } else if (!finalHideAfter) {
      setError("Please choose when the campaign should start.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit forms for selected options
      const submissions = [];

      if (selectedOrg) {
        submissions.push(
          submitForm(
            "advertise",
            {
              target_type: "org",
              organization_id: orgId,
              organization_slug: orgSlug || null,
              organization_name: orgName,
              program_id: null,
              program_name: null,
              show_from: toIsoString(showFrom),
              hide_after: toIsoString(finalHideAfter),
              duration_preset: durationPreset,
              notes: notes.trim() || null,
            },
            user?.id || null
          )
        );
      }

      if (selectedPrograms) {
        selectedProgramIds.forEach((programId) => {
          const program = programs.find((p) => p.id === programId);
          if (program) {
            // For "until_deadline", use the program's own deadline
            let programHideAfter = finalHideAfter;
            if (durationPreset === "until_deadline" && program.close_at) {
              programHideAfter = formatDateLocal(new Date(program.close_at));
            }

            submissions.push(
              submitForm(
                "advertise",
                {
                  target_type: "program",
                  organization_id: orgId,
                  organization_slug: orgSlug || null,
                  organization_name: orgName,
                  program_id: programId,
                  program_name: program.name,
                  show_from: toIsoString(showFrom),
                  hide_after: toIsoString(programHideAfter),
                  duration_preset: durationPreset,
                  notes: notes.trim() || null,
                },
                user?.id || null
              )
            );
          }
        });
      }

      await Promise.all(submissions);
      setSuccess(true);
      // Reload requests if log tab might be viewed
      if (orgId) {
        loadRequests();
      }
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 1800);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again."
      );
    }
  };

  const disableSubmit =
    submitting ||
    !isOrgReady ||
    (durationPreset === "until_deadline" &&
      (!selectedPrograms ||
        selectedProgramIds.size === 0 ||
        !selectedProgramsHaveDeadlines)) ||
    (durationPreset !== "until_deadline" &&
      !selectedOrg &&
      !selectedPrograms) ||
    (selectedPrograms && selectedProgramIds.size === 0) ||
    !showFrom ||
    (durationPreset === "custom" && !hideAfter);

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;

    if (selectedOrg) {
      total += calculatePrice("org", durationPreset, showFrom, hideAfter);
    }

    if (selectedPrograms && selectedProgramIds.size > 0) {
      if (durationPreset === "until_deadline") {
        // Sum individual program prices based on their own deadlines
        selectedProgramIds.forEach((programId) => {
          const program = programs.find((p) => p.id === programId);
          if (program && program.close_at) {
            total += calculateProgramPriceUntilDeadline(
              showFrom,
              program.close_at
            );
          }
        });
      } else {
        const programPrice = calculatePrice(
          "program",
          durationPreset,
          showFrom,
          hideAfter
        );
        total += programPrice * selectedProgramIds.size;
      }
    }

    return total;
  };

  const getOrgPrice = () => {
    if (!selectedOrg) return 0;
    return calculatePrice("org", durationPreset, showFrom, hideAfter);
  };

  const getProgramPrice = () => {
    if (!selectedPrograms || selectedProgramIds.size === 0) return 0;
    if (durationPreset === "until_deadline") {
      // Sum individual program prices based on their own deadlines
      let total = 0;
      selectedProgramIds.forEach((programId) => {
        const program = programs.find((p) => p.id === programId);
        if (program && program.close_at) {
          total += calculateProgramPriceUntilDeadline(
            showFrom,
            program.close_at
          );
        }
      });
      return total;
    }
    const pricePerProgram = calculatePrice(
      "program",
      durationPreset,
      showFrom,
      hideAfter
    );
    return pricePerProgram * selectedProgramIds.size;
  };

  const showCustomDates = durationPreset === "custom";

  // Helper to calculate time remaining for active campaigns
  const getTimeRemaining = (
    hideAfter: string | null | undefined
  ): string | null => {
    if (!hideAfter) return null;
    const endDate = new Date(hideAfter);
    const now = new Date();
    if (endDate <= now) return "Ended";
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "1 day left";
    if (diffDays < 7) return `${diffDays} days left`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return "1 week left";
    if (diffWeeks < 4) return `${diffWeeks} weeks left`;
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? "1 month left" : `${diffMonths} months left`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
        >
          ✕
        </button>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          Advertise your organization
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Request a featured placement so the super admin team can schedule your
          card in the carousel or gallery.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "form"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            New Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("log")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "log"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Request History
          </button>
        </div>

        {/* Form Tab */}
        {activeTab === "form" && (
          <>
            {success ? (
              <div className="rounded-lg bg-green-50 p-4 text-green-800">
                <p className="font-semibold">Thanks! Your request is in.</p>
                <p className="text-sm mt-1">
                  We&apos;ll confirm the dates and publish it through the
                  featured manager.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* What to feature - Two clear options (can select both) */}
                <div className="bg-indigo-50/30 rounded-xl p-6 border border-indigo-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    What do you want to feature?
                  </h3>
                  <div className="space-y-3">
                    {/* Option 1: Your organization */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition ${
                        durationPreset === "until_deadline"
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                          : selectedOrg
                          ? "border-blue-600 bg-blue-50 cursor-pointer"
                          : "border-gray-200 hover:border-blue-300 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrg}
                        onChange={(e) => setSelectedOrg(e.target.checked)}
                        disabled={
                          submitting || durationPreset === "until_deadline"
                        }
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Your organization
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              Feature your organization card
                            </div>
                          </div>
                          {selectedOrg && (
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-gray-900">
                                ${getOrgPrice().toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {durationPreset === "custom"
                                  ? "custom"
                                  : presetLabels[durationPreset]}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Organization Programs */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedPrograms
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrograms}
                        onChange={(e) => setSelectedPrograms(e.target.checked)}
                        disabled={submitting}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Organization Programs
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              Feature one or more of your programs
                            </div>
                          </div>
                          {selectedPrograms && selectedProgramIds.size > 0 && (
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-gray-900">
                                ${getProgramPrice().toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {selectedProgramIds.size}{" "}
                                {selectedProgramIds.size === 1
                                  ? "program"
                                  : "programs"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Show organization name when "org" is selected */}
                  {selectedOrg && (
                    <div className="mt-6 pt-6 border-t border-indigo-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Selected Organization
                      </h4>
                      <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">
                              Organization
                            </div>
                            <div className="text-base font-semibold text-gray-900">
                              {orgName || "Loading organization..."}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-gray-900">
                              ${getOrgPrice().toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {durationPreset === "custom" ||
                              durationPreset === "until_deadline"
                                ? durationPreset === "until_deadline"
                                  ? "until deadline"
                                  : "custom duration"
                                : `for ${presetLabels[durationPreset]}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show programs list when "programs" is selected */}
                  {selectedPrograms && (
                    <div className="mt-6 pt-6 border-t border-indigo-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Select Programs
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search programs
                          </label>
                          <input
                            type="text"
                            value={programSearch}
                            onChange={(e) => setProgramSearch(e.target.value)}
                            placeholder="Search programs..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            disabled={programsLoading || submitting}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto rounded-xl border-2 border-gray-200 divide-y divide-gray-200 bg-white shadow-sm">
                          {programsLoading ? (
                            <div className="p-4 text-sm text-gray-500">
                              Loading programs…
                            </div>
                          ) : filteredPrograms.length > 0 ? (
                            filteredPrograms.map((program) => {
                              const isSelected = selectedProgramIds.has(
                                program.id
                              );
                              return (
                                <label
                                  key={program.id}
                                  className={`flex items-start gap-3 p-3 cursor-pointer transition ${
                                    isSelected
                                      ? "bg-blue-50"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleProgram(program.id)}
                                    disabled={submitting}
                                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {program.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          Program
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="text-right ml-4">
                                          <div className="text-sm font-semibold text-gray-900">
                                            $
                                            {durationPreset === "until_deadline"
                                              ? calculateProgramPriceUntilDeadline(
                                                  showFrom,
                                                  program.close_at
                                                ).toFixed(2)
                                              : calculatePrice(
                                                  "program",
                                                  durationPreset,
                                                  showFrom,
                                                  hideAfter
                                                ).toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {durationPreset === "custom" ||
                                            durationPreset === "until_deadline"
                                              ? durationPreset ===
                                                "until_deadline"
                                                ? "until deadline"
                                                : "custom"
                                              : presetLabels[durationPreset]}
                                          </div>
                                          {durationPreset ===
                                            "until_deadline" &&
                                            program.close_at && (
                                              <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(
                                                  program.close_at
                                                ).toLocaleString(undefined, {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                })}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <div className="p-4 text-sm text-gray-500">
                              {programLoadError
                                ? programLoadError
                                : durationPreset === "until_deadline"
                                ? "No public programs with deadlines match that search."
                                : "No public programs match that search."}
                            </div>
                          )}
                        </div>
                        {selectedProgramIds.size > 0 && (
                          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 px-4 py-3 text-sm text-blue-800 font-medium">
                            <span className="font-bold">
                              {selectedProgramIds.size}
                            </span>{" "}
                            {selectedProgramIds.size === 1
                              ? "program selected"
                              : "programs selected"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration & Start Date - Combined section */}
                <div className="bg-emerald-50/30 rounded-xl p-6 border border-emerald-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-6">
                    Duration & Start Date
                  </h3>

                  {/* Duration selection */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      How long should it run?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {presetButtons
                        .filter(({ preset }) => preset !== "custom")
                        .map(({ preset, label }) => (
                          <button
                            key={preset}
                            type="button"
                            className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition ${
                              durationPreset === preset
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                            }`}
                            onClick={() => setDurationPreset(preset)}
                            disabled={submitting}
                          >
                            {label}
                          </button>
                        ))}
                      <button
                        type="button"
                        className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition ${
                          durationPreset === "custom"
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                        onClick={() => setDurationPreset("custom")}
                        disabled={submitting}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {/* Custom date inputs - only show when Custom is selected */}
                  {showCustomDates && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Custom Date Range
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white rounded-xl border-2 border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start date
                          </label>
                          <input
                            type="date"
                            value={showFrom}
                            onChange={(e) => setShowFrom(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            min={formatDateLocal(new Date())}
                            required
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End date
                          </label>
                          <input
                            type="date"
                            value={hideAfter}
                            onChange={(e) => setHideAfter(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            min={showFrom || formatDateLocal(new Date())}
                            required
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start date - always show when not custom */}
                  {!showCustomDates && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Start Date
                      </p>
                      <div className="p-5 bg-white rounded-xl border-2 border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          What day should the campaign start?
                        </label>
                        <input
                          type="date"
                          value={showFrom}
                          onChange={(e) => setShowFrom(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          min={formatDateLocal(new Date())}
                          required
                          disabled={submitting}
                        />
                        <p className="text-sm text-gray-600 mt-3">
                          {durationPreset === "until_deadline" ? (
                            <>
                              Will run from this date until the selected
                              program&apos;s deadline. Select today&apos;s date
                              to start ASAP.
                            </>
                          ) : (
                            <>
                              Will run for{" "}
                              <span className="font-semibold">
                                {presetLabels[durationPreset]}
                              </span>{" "}
                              from this date. Select today&apos;s date to start
                              ASAP.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing summary section */}
                <div className="bg-amber-50/30 rounded-xl p-6 border border-amber-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Pricing Summary
                  </h3>
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border-2 border-gray-200 space-y-3">
                    {selectedOrg && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Organization advertising
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${getOrgPrice().toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedPrograms && selectedProgramIds.size > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Program advertising ({selectedProgramIds.size}{" "}
                          {selectedProgramIds.size === 1
                            ? "program"
                            : "programs"}
                          )
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${getProgramPrice().toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">
                        Subtotal
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-green-700">
                          Launch Discount
                        </span>
                        <span className="text-xs text-gray-500 block">
                          100% off
                        </span>
                      </div>
                      <span className="text-lg font-bold text-green-700">
                        -${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        $0.00
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-800 font-medium">
                        🎉 Launch discount applied! You won&apos;t be charged
                        for this campaign.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional details */}
                <div className="bg-slate-50/30 rounded-xl p-6 border border-slate-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Additional Information
                  </h3>
                  <div className="p-5 bg-white rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Anything else we should know? Share context or a preferred card color."
                      disabled={submitting}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800 font-medium">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disableSubmit}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Log Tab */}
        {activeTab === "log" && (
          <div className="space-y-4">
            {requestsLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading requests...
              </div>
            ) : requestsError ? (
              <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800">
                {requestsError}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No advertisement requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const formData = request.form_data || {};
                  const showFrom = formData.show_from
                    ? new Date(formData.show_from)
                    : null;
                  const hideAfter = formData.hide_after
                    ? new Date(formData.hide_after)
                    : null;
                  const isActive =
                    showFrom &&
                    hideAfter &&
                    new Date() >= showFrom &&
                    new Date() <= hideAfter &&
                    request.status === "approved";
                  const timeRemaining = isActive
                    ? getTimeRemaining(formData.hide_after)
                    : null;
                  const isUpcoming =
                    showFrom &&
                    new Date() < showFrom &&
                    request.status === "approved";
                  const isEnded = hideAfter && new Date() > hideAfter;

                  return (
                    <div
                      key={request.id}
                      className={`rounded-lg border-2 bg-white p-4 ${
                        isActive
                          ? "border-green-200 bg-green-50/30"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              {formData.target_type === "program"
                                ? formData.program_name || "Program"
                                : "Organization feature"}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Active
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                Upcoming
                              </span>
                            )}
                            {isEnded && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Ended
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                request.status === "approved"
                                  ? "bg-blue-100 text-blue-800"
                                  : request.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1 mt-2">
                            {timeRemaining && (
                              <div className="font-semibold text-green-700">
                                ⏱️ {timeRemaining}
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">
                                Dates:
                              </span>{" "}
                              {formatDateDisplay(formData.show_from)} →{" "}
                              {formatDateDisplay(formData.hide_after)}
                            </div>
                            {formData.duration_preset && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Duration:
                                </span>{" "}
                                {formData.duration_preset === "until_deadline"
                                  ? "Until deadline"
                                  : formData.duration_preset === "custom"
                                  ? "Custom"
                                  : presetLabels[
                                      formData.duration_preset as DurationPreset
                                    ] || formData.duration_preset}
                              </div>
                            )}
                            {formData.target_type === "program" &&
                              formData.program_name && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Program:
                                  </span>{" "}
                                  {formData.program_name}
                                </div>
                              )}
                            {formData.target_type === "org" &&
                              formData.organization_name && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Org name:
                                  </span>{" "}
                                  {formData.organization_name}
                                </div>
                              )}
                            <div>
                              <span className="font-medium text-gray-700">
                                Submitted:
                              </span>{" "}
                              {new Date(request.created_at).toLocaleString()}
                            </div>
                            {request.reviewed_at && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  Reviewed:
                                </span>{" "}
                                {new Date(request.reviewed_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
