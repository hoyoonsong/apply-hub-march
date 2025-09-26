import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isUUID } from "../../lib/id";
import {
  getApplication,
  submitApplication,
  saveApplication,
  startOrGetApplication,
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
import { useAuth } from "../../auth/AuthProvider";
import LoginModal from "../../components/LoginModal";

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
  // projected fields from app_get_application_v1
  program_name?: string;
  program_metadata?: any;
};

export default function ApplicationPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [appRow, setAppRow] = useState<AppRow | null>(null);
  const [schema, setSchema] = useState<ProgramApplicationSchema>({});
  const [submitting, setSubmitting] = useState(false);
  const [programDeadline, setProgramDeadline] = useState<string | null>(null);
  const [programOpenDate, setProgramOpenDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileSnap, setProfileSnap] = useState<any>(null);
  const [programDetails, setProgramDetails] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Handle redirect after successful authentication
  useEffect(() => {
    if (user && showSignUpModal) {
      setShowSignUpModal(false);
      // Refresh the page to load the authenticated user flow
      window.location.reload();
    }
  }, [user, showSignUpModal]);

  useEffect(() => {
    if (!isUUID(appId)) return;
    if (authLoading) return; // Wait for auth to load

    (async () => {
      try {
        // If user is not authenticated, show preview mode
        if (!user) {
          // For non-authenticated users, use the secure RPC function
          try {
            const { data: progData, error: progError } = await supabase.rpc(
              "public_get_program_from_app_id",
              { p_app_id: appId! }
            );

            if (progError || !progData || progData.length === 0) {
              console.log("Cannot access program data for preview:", progError);
              console.log(
                "RPC function may not exist yet. Showing generic preview."
              );

              // Fallback: Show a generic preview with sign-up prompt
              setSchema({ items: [] });
              setProgramDetails({
                id: "unknown",
                name: "Application Preview",
                description:
                  "We can't pull up your application at this moment. Please try again later or contact support if the issue persists.",
                organization_name: "Organization",
              });
              return; // Exit early for preview mode
            }

            const program = progData[0]; // RPC returns array, get first result

            // Set schema from the program data
            setSchema({ items: program.application_schema?.fields || [] });
            setProgramDeadline(program?.close_at || null);
            setProgramOpenDate(program?.open_at || null);
            setProgramDetails({
              id: program.program_id,
              name: program.program_name,
              description: program.program_description,
              organization_name: program.organization_name,
            });
            return; // Exit early for preview mode
          } catch (error: any) {
            console.log("Error loading preview for non-user:", error.message);
            console.log("Showing generic preview instead.");

            // Fallback: Show a generic preview with sign-up prompt
            setSchema({ items: [] });
            setProgramDetails({
              id: "unknown",
              name: "Application Preview",
              description:
                "We can't pull up your application at this moment. Please try again later or contact support if the issue persists.",
              organization_name: "Organization",
            });
            return; // Exit early for preview mode
          }
        }

        // Authenticated user flow - load full application
        console.log(
          "🔍 ApplicationPage - Loading application for appId:",
          appId
        );
        const app = await getApplication(appId!);
        console.log("🔍 ApplicationPage - Loaded application:", app);

        // If no application found, this might be a program ID - try to start/create an application
        if (!app || !app.id) {
          console.log(
            "🔍 ApplicationPage - No application found, trying to start new application for program:",
            appId
          );
          try {
            const newApp = await startOrGetApplication(appId!);
            console.log(
              "🔍 ApplicationPage - Started new application:",
              newApp
            );
            setAppRow(newApp);

            // Load schema using the program ID directly
            const schema = await loadApplicationSchemaById(appId!);
            console.log("🔍 ApplicationPage - Loaded schema:", schema);
            setSchema({ items: schema.fields || [] });
          } catch (error) {
            console.error(
              "🔍 ApplicationPage - Failed to start application:",
              error
            );
            // If we can't create an application, fall back to preview mode for authenticated users
            console.log(
              "🔍 ApplicationPage - Falling back to preview mode for authenticated user"
            );

            // Try to get program data using the public RPC function (same as preview mode)
            try {
              const { data: progData, error: progError } = await supabase.rpc(
                "public_get_program_from_app_id",
                { p_app_id: appId! }
              );

              if (progError || !progData || progData.length === 0) {
                console.log("Cannot access program data:", progError);
                navigate("/unauthorized");
                return;
              }

              const program = progData[0];
              setSchema({ items: program.application_schema?.fields || [] });
              setProgramDeadline(program?.close_at || null);
              setProgramOpenDate(program?.open_at || null);
              setProgramDetails({
                id: program.program_id,
                name: program.program_name,
                description: program.program_description,
                organization_name: program.organization_name,
              });

              // Set a dummy app row for preview mode
              setAppRow({
                id: appId!,
                program_id: program.program_id,
                user_id: user?.id || "",
                status: "draft",
                answers: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                program_name: program.program_name,
                program_metadata: program.application_schema,
              });

              return; // Exit early for preview mode
            } catch (previewError) {
              console.error(
                "🔍 ApplicationPage - Preview mode also failed:",
                previewError
              );
              navigate("/unauthorized");
              return;
            }
          }
        } else {
          setAppRow(app);

          // Load schema using centralized loader
          const schema = await loadApplicationSchemaById(app.program_id);
          console.log("🔍 ApplicationPage - Loaded schema:", schema);
          setSchema({ items: schema.fields || [] });
        }

        // Get program details for deadline info - check if program is published
        const { data: progData, error: progError } = await supabase
          .from("programs_public")
          .select("open_at, close_at, published")
          .eq("id", app.program_id)
          .single();

        if (progError || !progData) {
          // Program not found
          console.log("Program not found:", progError);
          navigate("/unauthorized");
          return;
        }

        // Check if program is published
        if (!progData.published) {
          console.log("Program is not published");
          navigate("/unauthorized");
          return;
        }

        console.log("Program data:", progData);
        console.log("Open at:", progData?.open_at);
        console.log("Close at:", progData?.close_at);
        setProgramDeadline(progData?.close_at || null);
        setProgramOpenDate(progData?.open_at || null);

        // Set editing mode: draft apps are editable, submitted apps are read-only by default
        setIsEditing(app.status === "draft");

        // Load full program details and organization
        try {
          // Get program details from programs_public table
          const { data: programData, error: programError } = await supabase
            .from("programs")
            .select("id, name, description, organization_id, metadata")
            .eq("id", app.program_id)
            .single();

          if (!programError && programData) {
            setProgramDetails(programData);

            // Load profile snapshot if program uses profile autofill
            const program = {
              id: programData.id,
              name: programData.name,
              metadata: programData.metadata,
            };

            if (programUsesProfile(program)) {
              // If application is submitted, use the snapshot from answers
              // If application is draft, use live profile data
              if (app.status === "submitted" && app.answers?.profile) {
                // Use the snapshot that was saved when submitted
                setProfileSnap(app.answers.profile);
                console.log(
                  "Using profile snapshot from submitted application"
                );
              } else {
                // For draft applications, just load the profile for display
                // Don't merge or save it until submission
                const profile = await fetchProfileSnapshot();
                setProfileSnap(profile);
                console.log(
                  "Loaded live profile data for draft application (not saved yet)"
                );
              }
            }

            // Load organization details
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("id, name")
              .eq("id", programData.organization_id)
              .single();

            if (!orgError && orgData) {
              setOrganization(orgData);
            }
          }
        } catch (e) {
          console.error("Failed to load program details:", e);
        }
      } catch (e) {
        console.error("Error loading application:", e);
        navigate("/");
      }
    })();
  }, [appId, navigate, user, authLoading]);

  const { answers, setAnswers } = useApplicationAutosave(
    appId!,
    appRow?.answers ?? {},
    appRow?.updated_at ?? undefined
  );

  // Update answers when appRow changes (e.g., after submission)
  useEffect(() => {
    if (appRow?.answers) {
      setAnswers(appRow.answers);
    }
  }, [appRow?.answers, setAnswers]);

  const items = useMemo(() => {
    const rawItems = schema.items ?? [];
    // Filter out any invalid/empty items
    const validItems = rawItems.filter(
      (item) => item && item.label && item.label.trim() !== "" && item.type
    );
    console.log("🔍 ApplicationPage - items:", { rawItems, validItems });
    console.log("🔍 ApplicationPage - rawItems details:", rawItems);
    return validItems;
  }, [schema]);

  // Check if application is currently open (between open and close dates)
  const isOpen = isApplicationOpen(programOpenDate, programDeadline);
  const isBeforeOpen = isBeforeOpenDate(programOpenDate);
  const isPastDeadlineFlag = isPastDeadline(programDeadline);

  // Check if editing is allowed (application is open and not past deadline)
  const canEdit = isOpen && !isPastDeadlineFlag;
  const isFormEditable = canEdit && isEditing;

  const update = (name: string, value: any) => {
    if (!isFormEditable) return; // Don't allow updates if not in edit mode
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!appRow || !isUUID(appId)) return;
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

    // Validate required fields before submitting
    if (schema) {
      const missing = missingRequired({ fields: schema.items || [] }, answers);
      if (missing.length > 0) {
        alert(
          `Please complete the following required fields: ${missing.join(", ")}`
        );
        return;
      }
    }

    // Validate profile sections if program uses profile autofill
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
        // First time submitting - take fresh profile snapshot
        let finalAnswers = answers;
        if (programDetails && programUsesProfile(programDetails)) {
          // Fetch fresh profile data at submission time to capture any recent edits
          const freshProfile = await fetchProfileSnapshot();
          if (freshProfile) {
            finalAnswers = mergeProfileIntoAnswers(answers, freshProfile);
            console.log(
              "🔍 ApplicationPage - Taking fresh profile snapshot at submission time"
            );
          } else {
            console.warn(
              "🔍 ApplicationPage - Profile enabled but no profile data found"
            );
          }
        }

        await submitApplication(appId!, finalAnswers);
        // Reload application data to get updated status and answers
        const updatedApp = await getApplication(appId!);
        setAppRow(updatedApp);
        // Clear localStorage after successful submission
        localStorage.removeItem(`app:${appId}:answers`);
        alert("Application submitted!");
        navigate("/");
      } else if (appRow.status === "submitted" && isEditing) {
        // Saving changes to already submitted application
        await saveApplication(appId!, answers);
        // Reload application data to get updated answers
        const updatedApp = await getApplication(appId!);
        setAppRow(updatedApp);
        setIsEditing(false); // Exit edit mode and lock fields
        alert("Changes saved!");
      }
    } catch (e: any) {
      alert(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isUUID(appId)) return null; // Guard against undefined ID
  if (authLoading) return <div>Loading...</div>;

  // For non-authenticated users, show preview mode
  if (!user) {
    if (!schema || !programDetails) return <div>Loading...</div>;

    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {programDetails?.name || "Application"}
                  </h1>
                  {programDetails?.description && (
                    <p className="text-gray-600 mt-2">
                      {programDetails.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {programDetails?.organization_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Sign Up Prompt - only show if we have application data */}
            {schema.items && schema.items.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-blue-900">
                      Create an account to submit
                    </h3>
                    <p className="text-blue-700 mt-1">
                      You need to create an account to fill out and submit this
                      application.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setShowSignUpModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Sign Up / Log In
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Application Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">
                Application Preview
              </h2>
              {schema.items && schema.items.length > 0 ? (
                <div className="space-y-6">
                  {schema.items.map((field: any) => (
                    <div
                      key={field.id}
                      className="border-b border-gray-100 pb-4"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-gray-500">
                        {field.type === "short_text" && "Short text answer..."}
                        {field.type === "long_text" && "Long text answer..."}
                        {field.type === "date" && "Select date..."}
                        {field.type === "select" &&
                          `Choose from: ${field.options?.join(", ")}`}
                        {field.type === "checkbox" && "Checkbox option..."}
                        {field.type === "file" && "Upload file..."}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-2">
                    Unable to load application preview
                  </p>
                  <p className="text-sm text-gray-500">
                    We can't pull up your application at this moment. Please try
                    again later or contact support if the issue persists.
                  </p>
                </div>
              )}
              {schema.items && schema.items.length > 0 ? (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowSignUpModal(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Sign Up to Fill Out Application
                  </button>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">
                      Please try refreshing the page or contact support if the
                      issue persists.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Login Modal */}
        <LoginModal
          open={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
        />
      </>
    );
  }

  // Authenticated user flow
  if (!appRow || !schema) return <div>Loading...</div>;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {programDetails?.name || appRow.program_name || "Application"}
                </h1>
                {programDetails?.description && (
                  <p className="mt-1 text-gray-600">
                    {programDetails.description}
                  </p>
                )}
                {organization && (
                  <p className="mt-1 text-sm text-gray-500">
                    Organization: {organization.name}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <span>←</span>
                  Back to Home
                </button>
                {/* Show Edit Application button only for submitted apps that can still be edited */}
                {appRow.status === "submitted" && canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    Edit Application
                  </button>
                )}

                {/* Show Cancel button only when editing submitted apps */}
                {isEditing && appRow.status === "submitted" && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Application Status */}
          <div className="mb-6">
            <div
              className={`rounded-lg border p-4 ${
                canEdit
                  ? "bg-green-50 border-green-200"
                  : isBeforeOpen
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {canEdit ? "📅" : isBeforeOpen ? "⏰" : "🔒"}
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    {canEdit
                      ? "Application Open"
                      : isBeforeOpen
                      ? "Application Coming Soon"
                      : "Application Closed"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isBeforeOpen
                      ? getOpenDateMessage(programOpenDate)
                      : programDeadline
                      ? getDeadlineMessage(programDeadline)
                      : "No deadline set"}
                  </div>
                  {appRow.status === "submitted" && canEdit && (
                    <div className="text-sm text-green-600 mt-1">
                      ✓ Application submitted - You can still edit until the
                      deadline
                    </div>
                  )}
                  {isBeforeOpen && (
                    <div className="text-sm text-yellow-600 mt-1">
                      Application will be available soon
                    </div>
                  )}
                  {!canEdit && !isBeforeOpen && (
                    <div className="text-sm text-red-600 mt-1">
                      Application is locked - deadline has passed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Application Card */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              {/* Only show form if application is open or past deadline (for viewing submitted apps) */}
              {!isBeforeOpen && (
                <div className="space-y-6">
                  {/* Profile Autofill Section */}
                  {(() => {
                    const program = {
                      id: programDetails?.id,
                      name: programDetails?.name,
                      metadata: programDetails?.metadata,
                    };

                    return (
                      programUsesProfile(program) && (
                        <div className="mb-8">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <h2 className="text-lg font-semibold text-blue-900">
                                  Applicant Profile (Autofilled)
                                </h2>
                              </div>
                              <a
                                href="/profile"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                Edit Profile →
                              </a>
                            </div>
                            <p className="text-sm text-blue-700 mb-6">
                              {appRow?.status === "submitted"
                                ? "This information was automatically filled from your profile at the time of submission and is now locked."
                                : "This information was automatically filled from your profile and will be updated as you make changes."}
                            </p>

                            {profileSnap ? (
                              <ProfileCard
                                profile={profileSnap}
                                sectionSettings={
                                  programDetails?.metadata?.application?.profile
                                    ?.sections
                                }
                              />
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
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

                  {/* Organization Application Questions Section - only show if there are items */}
                  {items.length > 0 && (
                    <div
                      className={(() => {
                        const program = {
                          id: programDetails?.id,
                          name: programDetails?.name,
                          metadata: programDetails?.metadata,
                        };
                        const hasProfileAutofill = programUsesProfile(program);
                        return hasProfileAutofill
                          ? "bg-gray-50 border border-gray-200 rounded-lg p-6"
                          : "space-y-6";
                      })()}
                    >
                      {/* Only show header if there are other sections (profile autofill, etc.) */}
                      {(() => {
                        const program = {
                          id: programDetails?.id,
                          name: programDetails?.name,
                          metadata: programDetails?.metadata,
                        };
                        const hasProfileAutofill = programUsesProfile(program);

                        if (hasProfileAutofill) {
                          return (
                            <>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                  Organization Application Questions
                                </h2>
                              </div>
                              <p className="text-sm text-gray-600 mb-6">
                                Custom questions created by this organization.
                              </p>
                            </>
                          );
                        }
                        return null; // No header when it's just custom questions
                      })()}
                      <div className="space-y-6">
                        {items.map((item, idx) => {
                          const key = item.key || `q_${idx}`;
                          const val = answers?.[key] ?? "";

                          switch (item.type) {
                            case "short_text":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {item.label}
                                    {item.required && " *"}
                                  </label>
                                  <input
                                    className={`w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <WordLimitedTextarea
                                    label={item.label}
                                    value={val}
                                    onChange={(value) => update(key, value)}
                                    maxWords={item.maxWords ?? 100}
                                    rows={4}
                                    required={item.required}
                                    disabled={!isFormEditable}
                                  />
                                </div>
                              );
                            case "checkbox":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={!!val}
                                      onChange={(e) =>
                                        update(key, e.target.checked)
                                      }
                                      disabled={!isFormEditable}
                                      className={`h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 ${
                                        !isFormEditable ? "opacity-50" : ""
                                      }`}
                                      style={{
                                        cursor: isFormEditable
                                          ? "pointer"
                                          : "not-allowed",
                                      }}
                                    />
                                    <label className="text-sm font-medium text-gray-700">
                                      {item.label}
                                      {item.required && " *"}
                                    </label>
                                  </div>
                                </div>
                              );
                            case "date":
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {item.label}
                                    {item.required && " *"}
                                  </label>
                                  <input
                                    type="date"
                                    className={`w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {item.label}
                                    {item.required && " *"}
                                  </label>
                                  <select
                                    className={`w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                              return (
                                <div
                                  key={key}
                                  className="bg-white border border-gray-200 rounded-lg p-6"
                                >
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {item.label}
                                    {item.required && " *"}
                                  </label>
                                  <SimpleFileUpload
                                    applicationId={appId!}
                                    fieldId={key}
                                    value={answers[key] || ""}
                                    onChange={(value) => update(key, value)}
                                    disabled={!isFormEditable}
                                  />
                                </div>
                              );
                            default:
                              return null;
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button at bottom like Google Forms - only show if not before open */}
              {!isBeforeOpen &&
                (appRow.status === "draft" ||
                  (appRow.status === "submitted" && isEditing)) && (
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleSubmit}
                      className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
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
          open={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
        />
      </div>
    </>
  );
}
