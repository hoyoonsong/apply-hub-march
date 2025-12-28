import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getApplication,
  submitApplication,
  saveApplication,
} from "../../lib/rpc";
import { loadApplicationSchemaById } from "../../lib/schemaLoader";
import { useApplicationAutosave } from "../../components/useApplicationAutosave";
import { SimpleFileUpload } from "../../components/attachments/SimpleFileUpload";
import ProfileCard from "../../components/profile/ProfileCard";
import WordLimitedTextarea from "../../components/WordLimitedTextarea";
import {
  programUsesProfile,
  fetchProfileSnapshot,
  mergeProfileIntoAnswers,
  getRequiredProfileSections,
  validateProfileSections,
} from "../../lib/profileFill";
import type { ProgramApplicationSchema } from "../../types/application";
import { missingRequired } from "../../utils/answers";
import {
  isPastDeadline,
  isBeforeOpenDate,
  isApplicationOpen,
  getDeadlineMessage,
  getOpenDateMessage,
} from "../../lib/deadlineUtils";
import { supabase } from "../../lib/supabase";
import { isUUID } from "../../lib/id";
import { useAuth } from "../../auth/AuthProvider";
import LoginModal from "../../components/LoginModal";
import AutoLinkText from "../../components/AutoLinkText";

type AppRow = {
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
  answers: any;
  created_at: string;
  updated_at: string;
  program_name?: string;
  program_metadata?: any;
};

export default function ApplicationForm({
  applicationIdProp,
  programIdProp,
}: {
  applicationIdProp?: string;
  programIdProp?: string;
} = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const applicationId = useMemo(() => {
    return applicationIdProp || (params?.id as string) || "";
  }, [params, applicationIdProp]);

  const [appRow, setAppRow] = useState<AppRow | null>(null);

  // Get programId from prop or from appRow (if accessing via /applications/:id)
  const programId = useMemo(() => {
    return programIdProp || appRow?.program_id || null;
  }, [programIdProp, appRow?.program_id]);
  const [schema, setSchema] = useState<ProgramApplicationSchema>({});
  const [submitting, setSubmitting] = useState(false);
  const [programDeadline, setProgramDeadline] = useState<string | null>(null);
  const [programOpenDate, setProgramOpenDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileSnap, setProfileSnap] = useState<any>(null);
  const [programDetails, setProgramDetails] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);

  // Load application data if we have an applicationId (user is logged in)
  useEffect(() => {
    if (!isUUID(applicationId)) return;

    (async () => {
      try {
        const app = await getApplication(applicationId!);

        if (!app || !app.program_id) {
          navigate("/unauthorized");
          return;
        }

        setAppRow(app);

        // Load schema and program details (shared logic)
        await loadProgramData(app.program_id, app);

        // Set editing mode: draft apps are editable, submitted apps are read-only by default
        setIsEditing(app.status === "draft");
      } catch (e: any) {
        console.error("Error loading application:", e);
        navigate("/unauthorized");
      }
    })();
  }, [applicationId, navigate]);

  // Load program data when we have programId but no applicationId (user not logged in)
  useEffect(() => {
    if (isUUID(applicationId) || !programId) return;

    (async () => {
      try {
        await loadProgramData(programId, null);
      } catch (e: any) {
        console.error("Error loading program:", e);
      }
    })();
  }, [programId, applicationId, user]);

  // Shared function to load program data
  const loadProgramData = async (progId: string, app: AppRow | null) => {
    // Load schema using centralized loader
    const loadedSchema = await loadApplicationSchemaById(progId);
    console.log("🔍 ApplicationForm - Loaded schema:", loadedSchema);
    // Convert fields to items format (matching ApplicationPage structure)
    const items = (loadedSchema.fields || []).map((f: any) => ({
      key: f.key || f.id || `q_${Math.random()}`,
      type: f.type?.toLowerCase() || f.type,
      label: f.label || f.name || "",
      required: f.required,
      maxLength: f.maxLength,
      maxWords: f.maxWords,
      options: f.options,
    }));
    setSchema({ items });

    // Get program details for deadline info - check if program is published
    const { data: progData, error: progError } = await supabase
      .from("programs_public")
      .select("open_at, close_at, published")
      .eq("id", progId)
      .single();

    if (progError || !progData) {
      if (isUUID(applicationId)) {
        navigate("/unauthorized");
      }
      return;
    }

    // Check if program is published
    if (!progData.published) {
      if (isUUID(applicationId)) {
        navigate("/unauthorized");
      }
      return;
    }

    setProgramDeadline(progData?.close_at || null);
    setProgramOpenDate(progData?.open_at || null);

    // Load full program details first, then parallelize dependent queries
    try {
      const { data: programData, error: programError } = await supabase
        .from("programs")
        .select(
          "id, name, description, organization_id, metadata, open_at, close_at, spots_mode, spots_count"
        )
        .eq("id", progId)
        .single();

      if (!programError && programData) {
        setProgramDetails(programData);

        // Load profile snapshot and organization in parallel (after we have programData)
        const profilePromise = (async () => {
          const currentUser = user;
          if (currentUser && app) {
            const program = {
              id: programData.id,
              name: programData.name,
              metadata: programData.metadata,
            };

            if (programUsesProfile(program)) {
              if (app.status === "submitted" && app.answers?.profile) {
                return app.answers.profile;
              } else {
                return await fetchProfileSnapshot();
              }
            }
          }
          return null;
        })();

        const orgPromise = supabase
          .from("organizations")
          .select("id, name")
          .eq("id", programData.organization_id)
          .single();

        const [profileData, orgDataResult] = await Promise.allSettled([
          profilePromise,
          orgPromise,
        ]);

        if (profileData.status === "fulfilled" && profileData.value) {
          setProfileSnap(profileData.value);
        }

        if (
          orgDataResult.status === "fulfilled" &&
          !orgDataResult.value.error &&
          orgDataResult.value.data
        ) {
          setOrganization(orgDataResult.value.data);
        }
      }
    } catch (e) {
      console.error("Failed to load program details:", e);
    }
  };

  const { answers, setAnswers, saveStatus } = useApplicationAutosave(
    applicationId || "",
    appRow?.answers ?? {},
    appRow?.updated_at ?? undefined
  );

  // Update answers when appRow changes
  useEffect(() => {
    if (appRow?.answers) {
      setAnswers(appRow.answers);
    }
  }, [appRow?.answers, setAnswers]);

  const items = useMemo(() => schema.items ?? [], [schema]);

  // Check if application is currently open
  const isOpen = isApplicationOpen(programOpenDate, programDeadline);
  const isBeforeOpen = isBeforeOpenDate(programOpenDate);
  const isPastDeadlineFlag = isPastDeadline(programDeadline);

  // Check if editing is allowed (must be logged in)
  const canEdit = user && isOpen && !isPastDeadlineFlag;
  const isFormEditable =
    canEdit && (isEditing || !appRow || (appRow && appRow.status === "draft"));

  const update = (name: string, value: any) => {
    if (!isFormEditable) return;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!appRow || !isUUID(applicationId)) return;
    if (!canEdit) {
      if (isBeforeOpen) {
        alert("Cannot submit - application has not opened yet");
      } else if (isPastDeadlineFlag) {
        alert("Cannot submit - deadline has passed");
      } else {
        alert("Cannot submit - application is not currently open");
      }
      return;
    }

    // Validate required fields
    if (schema) {
      const missing = missingRequired(
        { fields: (schema.items || []) as any },
        answers
      );
      if (missing.length > 0) {
        alert(
          `Please complete the following required fields: ${missing.join(", ")}`
        );
        return;
      }
    }

    // Validate profile sections
    if (programDetails && programUsesProfile(programDetails)) {
      const requiredSections = getRequiredProfileSections(programDetails);
      const profileValidation = validateProfileSections(
        profileSnap,
        requiredSections
      );

      if (!profileValidation.isValid) {
        alert(
          `Please complete the following required profile sections:\n${profileValidation.missingSections.join(
            "\n"
          )}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (appRow.status === "draft") {
        let finalAnswers = answers;
        if (programDetails && programUsesProfile(programDetails)) {
          const freshProfile = await fetchProfileSnapshot();
          if (freshProfile) {
            finalAnswers = mergeProfileIntoAnswers(answers, freshProfile);
          }
        }

        await submitApplication(applicationId!, finalAnswers);
        const updatedApp = await getApplication(applicationId!);
        setAppRow(updatedApp);
        localStorage.removeItem(`app:${applicationId}:answers`);
        alert("Application submitted!");
        navigate("/my-submissions");
      } else if (appRow.status === "submitted" && isEditing) {
        await saveApplication(applicationId!, answers);
        const updatedApp = await getApplication(applicationId!);
        setAppRow(updatedApp);
        setIsEditing(false);
        alert("Changes saved!");
      }
    } catch (e: any) {
      alert(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while auth is loading or while we're still loading program data
  if (
    authLoading ||
    (!programDetails && !programId && !isUUID(applicationId))
  ) {
    return <div className="p-6">Loading...</div>;
  }

  // Don't render form if we don't have program details and schema
  if (!programDetails || !schema.items) {
    return <div className="p-6">Loading program details...</div>;
  }

  const isNotLoggedIn = !user && !authLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sign-in Banner - shown when user is not logged in */}
      {isNotLoggedIn && (
        <div className="bg-blue-600 text-white py-3 px-4 md:py-4 md:px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">
            <div>
              <div className="font-semibold text-sm md:text-base">
                Sign in to start or continue your application
              </div>
              <div className="text-xs md:text-sm text-blue-100 mt-0.5">
                You can view the application below, but you'll need to sign in
                to submit.
              </div>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-blue-600 font-semibold py-2 px-3 md:py-2 md:px-4 rounded-md hover:bg-blue-50 transition-colors text-xs md:text-sm whitespace-nowrap"
            >
              Sign up / Log in
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-4 md:mb-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 md:px-5 md:py-4">
            <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-4">
              <div className="md:col-start-1 md:row-start-1">
                <h1 className="text-lg md:text-2xl font-bold mb-0 leading-tight">
                  {programDetails?.name ||
                    appRow?.program_name ||
                    "Application"}
                </h1>
              </div>
              <div className="md:col-start-1 md:row-start-2">
                {programDetails?.description && (
                  <div className="-mt-3 text-xs md:text-sm text-gray-600 whitespace-pre-line leading-snug">
                    <AutoLinkText
                      text={programDetails.description}
                      preserveWhitespace={true}
                    />
                  </div>
                )}
                {organization && (
                  <p className="mt-1 text-sm md:text-base text-black-500">
                    Organization: {organization.name}
                  </p>
                )}
              </div>
              <div className="flex gap-2 md:gap-2 flex-wrap md:self-start md:col-start-2 md:row-start-1 md:mt-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-xs md:text-base"
                >
                  <span>←</span>
                  <span className="whitespace-nowrap">Back to Dashboard</span>
                </button>
                {appRow &&
                  appRow.status === "submitted" &&
                  canEdit &&
                  !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-2 md:px-4 md:py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 text-xs md:text-base"
                    >
                      Edit Application
                    </button>
                  )}
                {isEditing && appRow && appRow.status === "submitted" && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 md:px-4 md:py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600 text-xs md:text-base"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Status */}
        <div className="mb-4 md:mb-6">
          <div
            className={`rounded-lg border p-3 md:p-4 ${
              isBeforeOpen
                ? "bg-yellow-50 border-yellow-200"
                : isPastDeadlineFlag
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <span className="text-lg md:text-xl">
                {isBeforeOpen
                  ? "⏰"
                  : isPastDeadlineFlag
                  ? "🔒"
                  : canEdit
                  ? "📅"
                  : "🔒"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 text-sm md:text-base">
                  {isBeforeOpen
                    ? "Application Coming Soon"
                    : isPastDeadlineFlag
                    ? "Applications Closed"
                    : "Applications Open"}
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-0.5">
                  {isBeforeOpen
                    ? getOpenDateMessage(programOpenDate)
                    : programDeadline
                    ? getDeadlineMessage(programDeadline)
                    : "No deadline set"}
                </div>
                {/* Spots Information */}
                {(() => {
                  if (!programDetails?.spots_mode) return null;
                  if (programDetails.spots_mode === "unlimited") {
                    return (
                      <div className="text-xs md:text-sm font-medium text-blue-600 mt-1">
                        Unlimited spots available
                      </div>
                    );
                  }
                  if (
                    programDetails.spots_mode === "exact" &&
                    programDetails.spots_count !== null &&
                    programDetails.spots_count !== undefined
                  ) {
                    return (
                      <div className="text-xs md:text-sm font-medium text-blue-600 mt-1">
                        {programDetails.spots_count} spot
                        {programDetails.spots_count !== 1 ? "s" : ""} available
                      </div>
                    );
                  }
                  return null;
                })()}
                {appRow && appRow.status === "submitted" && canEdit && (
                  <div className="text-xs md:text-sm text-green-600 mt-1">
                    ✓ Application submitted - You can still edit until the
                    deadline
                  </div>
                )}
                {isBeforeOpen && (
                  <div className="text-xs md:text-sm text-yellow-600 mt-1">
                    Application will be available soon
                  </div>
                )}
                {!canEdit && !isBeforeOpen && (
                  <div
                    className={`text-xs md:text-sm mt-1 ${
                      isPastDeadlineFlag ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {isNotLoggedIn
                      ? "Application is locked - please sign in to apply"
                      : "Application is locked - deadline has passed"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Card */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 md:p-6">
            {!isBeforeOpen && (
              <div className="space-y-5 md:space-y-6">
                {/* Profile Autofill Section */}
                {(() => {
                  const program = {
                    id: programDetails?.id,
                    name: programDetails?.name,
                    metadata: programDetails?.metadata,
                  };

                  return (
                    programUsesProfile(program) && (
                      <div className="mb-5 md:mb-8">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
                          <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <h2 className="text-sm md:text-lg font-semibold text-blue-900 truncate">
                                Applicant Profile (Autofilled)
                              </h2>
                            </div>
                            <a
                              href="/profile"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap flex-shrink-0"
                            >
                              Edit Profile →
                            </a>
                          </div>
                          <p className="text-xs md:text-sm text-blue-700 mb-4 md:mb-6">
                            {appRow?.status === "submitted"
                              ? "This information was automatically filled from your profile at the time of submission and is now locked."
                              : isNotLoggedIn
                              ? "These sections will be automatically filled from your profile once you sign in."
                              : "This information was automatically filled from your profile and will be updated as you make changes."}
                          </p>

                          {profileSnap || isNotLoggedIn ? (
                            <ProfileCard
                              profile={profileSnap || {}}
                              sectionSettings={
                                programDetails?.metadata?.application?.profile
                                  ?.sections
                              }
                            />
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
                              <p className="text-xs md:text-sm text-yellow-800">
                                🔍 Debug: Profile autofill is enabled but no
                                profile data loaded yet. Check console for
                                debugging info.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  );
                })()}

                {/* Organization Application Questions Section */}
                {(() => {
                  const program = {
                    id: programDetails?.id,
                    name: programDetails?.name,
                    metadata: programDetails?.metadata,
                  };
                  const hasOtherSections = programUsesProfile(program);

                  return items.length === 0 ? (
                    <div className="p-4 md:p-6">
                      {hasOtherSections && (
                        <>
                          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                              Organization Application Questions
                            </h2>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                            Custom questions created by this organization.
                          </p>
                        </>
                      )}
                      <div className="text-xs md:text-sm text-slate-500">
                        This application doesn't include custom questions.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 md:p-6">
                      {hasOtherSections && (
                        <>
                          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                              Organization Application Questions
                            </h2>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                            Custom questions created by this organization.
                          </p>
                        </>
                      )}
                      <div className="space-y-4 md:space-y-6">
                        {items.map((item, idx) => {
                          const key = item.key || `q_${idx}`;
                          const val = answers?.[key] ?? "";

                          switch (item.type) {
                            case "short_text":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">
                                    <AutoLinkText text={item.label} />
                                    {item.required && (
                                      <span className="text-red-500 text-base font-semibold">
                                        {" "}
                                        *
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    className={`w-full rounded-md border border-gray-300 px-3 py-2 md:px-4 md:py-3 text-sm md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                      !isFormEditable
                                        ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                        : ""
                                    }`}
                                    value={val}
                                    maxLength={item.maxLength}
                                    onChange={(e) =>
                                      update(key, e.target.value)
                                    }
                                    disabled={!isFormEditable}
                                    readOnly={!isFormEditable}
                                    style={{
                                      cursor: isFormEditable
                                        ? "text"
                                        : "not-allowed",
                                    }}
                                  />
                                </div>
                              );
                            case "long_text":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <WordLimitedTextarea
                                    label={item.label}
                                    value={val}
                                    onChange={(value) => update(key, value)}
                                    maxWords={item.maxWords ?? 100}
                                    rows={3}
                                    required={item.required}
                                    disabled={!isFormEditable}
                                  />
                                </div>
                              );
                            case "checkbox":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <div className="flex items-center gap-2 md:gap-3">
                                    <input
                                      type="checkbox"
                                      checked={!!val}
                                      onChange={(e) =>
                                        update(key, e.target.checked)
                                      }
                                      disabled={!isFormEditable}
                                      className={`h-4 w-4 md:h-5 md:w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 flex-shrink-0 ${
                                        !isFormEditable ? "opacity-50" : ""
                                      }`}
                                      style={{
                                        cursor: isFormEditable
                                          ? "pointer"
                                          : "not-allowed",
                                      }}
                                    />
                                    <label className="text-xs md:text-sm font-medium text-gray-700">
                                      <AutoLinkText text={item.label} />
                                      {item.required && (
                                        <span className="text-red-500"> *</span>
                                      )}
                                    </label>
                                  </div>
                                </div>
                              );
                            case "date":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">
                                    <AutoLinkText text={item.label} />
                                    {item.required && (
                                      <span className="text-red-500 text-base font-semibold">
                                        {" "}
                                        *
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type="date"
                                    className={`w-full rounded-md border border-gray-300 px-3 py-2 md:px-4 md:py-3 text-sm md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                      !isFormEditable
                                        ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                        : ""
                                    }`}
                                    value={val}
                                    onChange={(e) =>
                                      update(key, e.target.value)
                                    }
                                    disabled={!isFormEditable}
                                    readOnly={!isFormEditable}
                                    style={{
                                      cursor: isFormEditable
                                        ? "text"
                                        : "not-allowed",
                                    }}
                                  />
                                </div>
                              );
                            case "select":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">
                                    <AutoLinkText text={item.label} />
                                    {item.required && (
                                      <span className="text-red-500 text-base font-semibold">
                                        {" "}
                                        *
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    className={`w-full rounded-md border border-gray-300 px-3 py-2 md:px-4 md:py-3 text-sm md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                      !isFormEditable
                                        ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                        : ""
                                    }`}
                                    value={val}
                                    onChange={(e) =>
                                      update(key, e.target.value)
                                    }
                                    disabled={!isFormEditable}
                                    style={{
                                      cursor: isFormEditable
                                        ? "pointer"
                                        : "not-allowed",
                                    }}
                                  >
                                    <option value="">
                                      Select an option...
                                    </option>
                                    {item.options?.map((option: string) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            case "file":
                              // Sanitize the value to ensure it's actually a file, not profile data
                              let fileValue = answers[key] || "";
                              if (fileValue && typeof fileValue === "string") {
                                try {
                                  const parsed = JSON.parse(fileValue);
                                  // If it looks like profile data (has __source, full_name, etc.), clear it
                                  if (
                                    parsed &&
                                    typeof parsed === "object" &&
                                    (parsed.__source ||
                                      parsed.full_name ||
                                      parsed.email ||
                                      parsed.address)
                                  ) {
                                    fileValue = "";
                                  }
                                } catch (e) {
                                  // If it's not JSON, keep it as is (might be a filename string)
                                }
                              } else if (
                                fileValue &&
                                typeof fileValue === "object" &&
                                (fileValue.__source ||
                                  fileValue.full_name ||
                                  fileValue.email ||
                                  fileValue.address)
                              ) {
                                // If it's already an object with profile data, clear it
                                fileValue = "";
                              }

                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
                                >
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">
                                    <AutoLinkText text={item.label} />
                                    {item.required && (
                                      <span className="text-red-500 text-base font-semibold">
                                        {" "}
                                        *
                                      </span>
                                    )}
                                  </label>
                                  <SimpleFileUpload
                                    applicationId={applicationId || ""}
                                    fieldId={key}
                                    value={fileValue}
                                    onChange={(value) => update(key, value)}
                                    disabled={!isFormEditable || !applicationId}
                                    applicationStatus={appRow?.status}
                                  />
                                </div>
                              );
                            default:
                              return null;
                          }
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Submit button */}
            {!isBeforeOpen &&
              appRow &&
              (appRow.status === "draft" ||
                (appRow.status === "submitted" && isEditing)) && (
                <div className="flex items-center justify-between pt-4 border-t">
                  {/* Autosave status indicator */}
                  {appRow.status === "draft" && (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {saveStatus === "saving" && (
                        <>
                          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                          <span>Saving...</span>
                        </>
                      )}
                      {saveStatus === "saved" && (
                        <>
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Saved</span>
                        </>
                      )}
                      {saveStatus === "error" && (
                        <>
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>Save failed - will retry</span>
                        </>
                      )}
                      {saveStatus === "idle" && (
                        <span className="text-gray-400">All changes saved</span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    className="rounded-md bg-blue-600 px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
                    disabled={submitting || !canEdit}
                    title={
                      !canEdit ? "Cannot submit - deadline has passed" : ""
                    }
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
