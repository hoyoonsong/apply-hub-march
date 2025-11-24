import { useEffect, useMemo, useState } from "react";
import { submitForm } from "../services/forms";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

type DurationPreset = "7d" | "14d" | "30d" | "custom";

type ProgramOption = {
  id: string;
  name: string;
  deleted_at?: string | null;
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
  custom: "Custom",
};

const presetToDays = (preset: DurationPreset) => {
  if (preset === "custom") return null;
  return Number(preset.replace("d", ""));
};

const formatDateTimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const addDaysToDateInput = (input: string, days: number) => {
  if (!input) return "";
  const base = new Date(input);
  base.setDate(base.getDate() + days);
  return formatDateTimeLocal(base);
};

const toIsoString = (input: string) =>
  input ? new Date(input).toISOString() : null;

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

  if (durationPreset === "custom") {
    if (!showFrom || !hideAfter) return 0;
    const start = new Date(showFrom);
    const end = new Date(hideAfter);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
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

  const isOrgReady = Boolean(orgId && orgName);

  useEffect(() => {
    if (!open) return;
    const start = new Date();
    start.setMinutes(start.getMinutes() + 5);
    const formatted = formatDateTimeLocal(start);
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
  }, [open]);

  // Auto-calculate hideAfter when preset changes (unless custom)
  useEffect(() => {
    if (!open || durationPreset === "custom") return;
    const days = presetToDays(durationPreset);
    if (days && showFrom) {
      setHideAfter(addDaysToDateInput(showFrom, days));
    }
  }, [showFrom, durationPreset, open]);

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
          .select("id,name,deleted_at,is_private")
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
    if (!programSearch.trim()) return programs;
    const term = programSearch.toLowerCase();
    return programs.filter((program) =>
      program.name.toLowerCase().includes(term)
    );
  }, [programs, programSearch]);

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
    if (!showFrom) {
      setError("Please choose when the campaign should start.");
      return;
    }
    // Calculate hideAfter if using preset
    let finalHideAfter = hideAfter;
    if (durationPreset !== "custom") {
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
                  hide_after: toIsoString(finalHideAfter),
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

  if (!open) return null;

  const disableSubmit =
    submitting ||
    !isOrgReady ||
    (!selectedOrg && !selectedPrograms) ||
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
      const programPrice = calculatePrice(
        "program",
        durationPreset,
        showFrom,
        hideAfter
      );
      total += programPrice * selectedProgramIds.size;
    }

    return total;
  };

  const getOrgPrice = () => {
    if (!selectedOrg) return 0;
    return calculatePrice("org", durationPreset, showFrom, hideAfter);
  };

  const getProgramPrice = () => {
    if (!selectedPrograms || selectedProgramIds.size === 0) return 0;
    const pricePerProgram = calculatePrice(
      "program",
      durationPreset,
      showFrom,
      hideAfter
    );
    return pricePerProgram * selectedProgramIds.size;
  };

  const showCustomDates = durationPreset === "custom";

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

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Thanks! Your request is in.</p>
            <p className="text-sm mt-1">
              We&apos;ll confirm the dates and publish it through the featured
              manager.
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
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedOrg
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.checked)}
                    disabled={submitting}
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
                          {durationPreset === "custom"
                            ? "custom duration"
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
                          const isSelected = selectedProgramIds.has(program.id);
                          return (
                            <label
                              key={program.id}
                              className={`flex items-start gap-3 p-3 cursor-pointer transition ${
                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
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
                                        {calculatePrice(
                                          "program",
                                          durationPreset,
                                          showFrom,
                                          hideAfter
                                        ).toFixed(2)}
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
                          );
                        })
                      ) : (
                        <div className="p-4 text-sm text-gray-500">
                          {programLoadError
                            ? programLoadError
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
                        Show from
                      </label>
                      <input
                        type="datetime-local"
                        value={showFrom}
                        onChange={(e) => setShowFrom(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        min={formatDateTimeLocal(new Date())}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hide after
                      </label>
                      <input
                        type="datetime-local"
                        value={hideAfter}
                        onChange={(e) => setHideAfter(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        min={showFrom || undefined}
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
                      When should the campaign start?
                    </label>
                    <input
                      type="datetime-local"
                      value={showFrom}
                      onChange={(e) => setShowFrom(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      min={formatDateTimeLocal(new Date())}
                      required
                      disabled={submitting}
                    />
                    <p className="text-sm text-gray-600 mt-3">
                      Will run for{" "}
                      <span className="font-semibold">
                        {presetLabels[durationPreset]}
                      </span>{" "}
                      from this date.
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
                      {selectedProgramIds.size === 1 ? "program" : "programs"})
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${getProgramPrice().toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Subtotal</span>
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
                  <span className="text-xl font-bold text-gray-900">$0.00</span>
                </div>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 font-medium">
                    🎉 Launch discount applied! You won&apos;t be charged for
                    this campaign.
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
      </div>
    </div>
  );
}
