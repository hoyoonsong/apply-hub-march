import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { isUUID } from "../../lib/id";
import { saveBuilderSchema } from "../../lib/programs";
import { loadApplicationSchema } from "../../lib/schemaLoader";
import type { AppItem } from "../../types/application";
import OptionsInput from "../../components/OptionsInput";
import ApplicationPreview from "../../components/ApplicationPreview";
import ProgramReviewerFormCard from "../../components/ProgramReviewerFormCard";
import AutoLinkText from "../../components/AutoLinkText";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Program = {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  organization_id: string;
  published: boolean;
  published_scope: string | null;
  published_coalition_id: string | null;
};

type Coalition = { id: string; slug: string; name: string };

// Sortable Field Component
function SortableField({
  field,
  idx,
  isDisabled,
  onUpdateField,
  onRemoveField,
}: {
  field: AppItem;
  idx: number;
  isDisabled: boolean;
  onUpdateField: (idx: number, updates: Partial<AppItem>) => void;
  onRemoveField: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key || `field-${idx}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      {/* Field Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-6">
          <span
            className={`text-2xl font-bold uppercase tracking-wide ${
              field.type === "long_text"
                ? "text-blue-600"
                : field.type === "short_text"
                ? "text-green-600"
                : field.type === "select"
                ? "text-purple-600"
                : field.type === "date"
                ? "text-orange-600"
                : field.type === "checkbox"
                ? "text-pink-600"
                : field.type === "file"
                ? "text-gray-600"
                : "text-gray-600"
            }`}
          >
            {field.type.replace("_", " ")}
          </span>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) =>
                onUpdateField(idx, { required: e.target.checked })
              }
              disabled={isDisabled}
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Required</span>
          </label>
        </div>
        <div className="flex items-center gap-1">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
            disabled={isDisabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => onRemoveField(idx)}
            disabled={isDisabled}
          >
            <span>🗑️</span>
            Remove
          </button>
        </div>
      </div>

      {/* Field Configuration */}
      <div className="space-y-4">
        {/* Question Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <div className="flex gap-3 items-center">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base disabled:opacity-50 disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your question here..."
              value={field.label}
              onChange={(e) => onUpdateField(idx, { label: e.target.value })}
              disabled={isDisabled}
            />
            {field.type === "long_text" && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Max words:
                </label>
                <input
                  className="w-20 border border-gray-300 rounded px-2 py-2 text-sm disabled:opacity-50 disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="number"
                  placeholder="100"
                  value={field.maxWords ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                      ? Number(e.target.value)
                      : undefined;
                    onUpdateField(idx, { maxWords: val });
                  }}
                  disabled={isDisabled}
                />
              </div>
            )}
          </div>
        </div>

        {/* Additional Options Row */}
        <div className="flex flex-wrap gap-4 items-center"></div>

        {/* Select Options */}
        {field.type === "select" && (
          <OptionsInput
            options={field.options ?? []}
            onChange={(options) => onUpdateField(idx, { options })}
            disabled={isDisabled}
          />
        )}
      </div>
    </div>
  );
}

export default function CoalitionProgramBuilder() {
  const { coalitionSlug, programId } = useParams<{
    coalitionSlug: string;
    programId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [includeApplyHubCommon, setIncludeApplyHubCommon] =
    useState<boolean>(true);
  const [includeCoalitionCommon, setIncludeCoalitionCommon] =
    useState<boolean>(false);
  const [includeProfile, setIncludeProfile] = useState<boolean>(false);
  const [includePersonalInfo, setIncludePersonalInfo] = useState<boolean>(true);
  const [includeFamilyInfo, setIncludeFamilyInfo] = useState<boolean>(true);
  const [includeWritingInfo, setIncludeWritingInfo] = useState<boolean>(true);
  const [includeExperienceInfo, setIncludeExperienceInfo] =
    useState<boolean>(true);
  const [fields, setFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag and drop handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(
          (item) => (item.key || `field-${items.indexOf(item)}`) === active.id
        );
        const newIndex = items.findIndex(
          (item) => (item.key || `field-${items.indexOf(item)}`) === over.id
        );

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Field update handler
  const handleUpdateField = (idx: number, updates: Partial<AppItem>) => {
    setFields((f) => {
      const newFields = [...f];
      newFields[idx] = { ...newFields[idx], ...updates };
      return newFields;
    });
  };

  // Field remove handler
  const handleRemoveField = (idx: number) => {
    setFields((f) => f.filter((_, i) => i !== idx));
  };

  // load coalition
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("coalitions")
        .select("id,slug,name")
        .eq("slug", coalitionSlug)
        .single();
      if (error || !data) return navigate("/unauthorized");
      setCoalition(data);
    })();
  }, [coalitionSlug, navigate]);

  // load program
  useEffect(() => {
    if (!isUUID(programId)) return; // Guard against undefined ID
    (async () => {
      const { data, error } = await supabase.rpc("cm_get_program_v1", {
        p_program_id: programId,
      });

      // Supabase returns a setof row => array
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        return navigate("/unauthorized");
      }

      const row = Array.isArray(data) ? data[0] : data;
      setProgram(row);

      const appMeta = row.metadata?.application || {};
      const formMeta = row.metadata?.form || {};
      setIncludeApplyHubCommon(!!appMeta?.common?.applyhub);
      setIncludeCoalitionCommon(!!appMeta?.common?.coalition);
      setIncludeProfile(
        !!(appMeta?.profile?.enabled || formMeta?.include_profile)
      );

      // Load individual profile section settings
      const profileSections = appMeta?.profile?.sections || {};
      setIncludePersonalInfo(profileSections.personal !== false); // Default to true
      setIncludeFamilyInfo(profileSections.family !== false); // Default to true
      setIncludeWritingInfo(profileSections.writing !== false); // Default to true
      setIncludeExperienceInfo(profileSections.experience !== false); // Default to true

      // Load schema using centralized loader
      try {
        const schema = await loadApplicationSchema(row);
        const loadedFields = schema.fields || [];
        const fieldsWithKeys = loadedFields.map((field, idx) => ({
          ...field,
          key: field.key || `field-${idx}-${Date.now()}`,
        }));
        setFields(fieldsWithKeys);
      } catch (e) {
        console.error("Failed to load schema:", e);
        setFields([]);
      }
    })();
  }, [programId, navigate]);

  // Realtime subscription to refresh program data when metadata changes
  useEffect(() => {
    if (!programId) return;

    const channel = supabase
      .channel(`program-${programId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "programs",
          filter: `id=eq.${programId}`,
        },
        (payload) => {
          console.log("🔍 Program metadata updated:", payload);
          // Reload the program data to get the latest metadata
          const reloadProgram = async () => {
            try {
              const { data, error } = await supabase.rpc("cm_get_program_v1", {
                p_program_id: programId,
              });

              if (!error && data) {
                const row = Array.isArray(data) ? data[0] : data;
                setProgram(row);

                // Reload schema with updated program data
                const schema = await loadApplicationSchema(row);
                const loadedFields = schema.fields || [];
                const fieldsWithKeys = loadedFields.map((field, idx) => ({
                  ...field,
                  key: field.key || `field-${idx}-${Date.now()}`,
                }));
                setFields(fieldsWithKeys);
              }
            } catch (e) {
              console.error(
                "Failed to reload program after realtime update:",
                e
              );
            }
          };
          reloadProgram();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [programId]);

  // simple field add helper
  function addField(type: AppItem["type"]) {
    const label = type
      .replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const key = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setFields((f) => [...f, { type, label, key, required: false }]);
  }

  async function onSave() {
    if (!program || !isUUID(programId) || !user) return; // Guard against undefined ID
    setSaving(true);
    setMsg(null);
    try {
      const updatedSchema = {
        common: {
          applyhub: includeApplyHubCommon,
          coalition: includeCoalitionCommon,
        },
        builder: fields,
        form: {
          include_profile: includeProfile,
          include_coalition_common_app: includeCoalitionCommon,
        },
        application: {
          profile: {
            enabled: includeProfile,
            sections: {
              personal: includePersonalInfo,
              family: includeFamilyInfo,
              writing: includeWritingInfo,
              experience: includeExperienceInfo,
            },
          },
        },
      };

      // Check if program is published - try multiple ways to determine this
      const isPublished =
        program?.published ||
        program?.metadata?.published ||
        program?.metadata?.review_status === "published";

      // Check if program is published or has changes requested
      const hasChangesRequested =
        program?.metadata?.review_status === "changes_requested";
      const requiresSuperApproval =
        program?.metadata?.requires_super_approval === true;

      // Only use pending changes logic for published programs that don't require super approval
      if ((isPublished || hasChangesRequested) && !requiresSuperApproval) {
        // If published, save changes as draft and mark as pending
        // Don't update the live schema - keep it separate
        const meta = (program?.metadata ?? {}) as any;
        const { error: updateError } = await supabase
          .from("programs")
          .update({
            metadata: {
              ...meta,
              // Keep the live schema in application_schema
              // Store draft changes in pending_schema
              pending_schema: updatedSchema,
              review_status: "pending_changes",
              pending_changes_at: new Date().toISOString(),
              pending_changes_by: user.id,
              // Update application flags AND save working schema
              application: {
                ...(meta.application || {}),
                schema: updatedSchema, // CRITICAL: Save working schema here too!
                profile: {
                  enabled: includeProfile,
                  sections: {
                    personal: includePersonalInfo,
                    family: includeFamilyInfo,
                    writing: includeWritingInfo,
                    experience: includeExperienceInfo,
                  },
                },
              },
            },
          })
          .eq("id", program?.id);

        if (updateError) throw new Error(updateError.message);

        // Force refresh the program data to update the UI
        const { data: refreshedData, error: refreshError } = await supabase.rpc(
          "cm_get_program_v1",
          {
            p_program_id: programId,
          }
        );

        if (!refreshError && refreshedData) {
          const row = Array.isArray(refreshedData)
            ? refreshedData[0]
            : refreshedData;
          setProgram(row);

          // Reload schema with updated program data
          const schema = await loadApplicationSchema(row);
          const loadedFields = schema.fields || [];
          const fieldsWithKeys = loadedFields.map((field, idx) => ({
            ...field,
            key: field.key || `field-${idx}-${Date.now()}`,
          }));
          setFields(fieldsWithKeys);
        }

        setMsg(
          "Changes saved as draft! These changes require super admin approval before going live."
        );
      } else {
        // If not published, save normally to the live schema
        await saveBuilderSchema(program.id, updatedSchema);

        // Force refresh the program data to update the UI
        const { data: refreshedData, error: refreshError } = await supabase.rpc(
          "cm_get_program_v1",
          {
            p_program_id: programId,
          }
        );

        if (!refreshError && refreshedData) {
          const row = Array.isArray(refreshedData)
            ? refreshedData[0]
            : refreshedData;
          setProgram(row);
        }

        setMsg("Saved.");
      }
    } catch (e: any) {
      setMsg(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (!program || !coalition || !isUUID(programId) || !user) return; // Guard against undefined ID
    setSaving(true);
    setMsg(null);
    try {
      // First, save any current changes
      console.log("Auto-saving current changes before publish...");
      await onSave();

      // Refresh program data to get the latest saved state
      const { data: refreshedData, error: refreshError } = await supabase.rpc(
        "cm_get_program_v1",
        {
          p_program_id: programId,
        }
      );

      if (refreshError) {
        console.error("Failed to refresh program data:", refreshError);
        throw new Error("Failed to refresh program data");
      }

      const refreshedProgram = Array.isArray(refreshedData)
        ? refreshedData[0]
        : refreshedData;
      const meta = (refreshedProgram?.metadata ?? {}) as any;
      const requiresSuperApproval = meta?.requires_super_approval === true;

      if (requiresSuperApproval) {
        // If super approval is required, submit for review instead of publishing directly
        const { error } = await supabase
          .from("programs")
          .update({
            metadata: {
              ...meta,
              review_status: "submitted",
              last_submitted_at: new Date().toISOString(),
              last_submitted_by: user.id,
            },
          })
          .eq("id", refreshedProgram.id);

        if (error) throw error;

        setMsg(
          "Program submitted for super admin approval. It will be published once approved."
        );
      } else {
        // Normal publish flow - publish directly
        const { error } = await supabase
          .from("programs")
          .update({
            published: true,
            published_at: new Date().toISOString(),
            published_scope: "coalition",
            published_by: user.id,
            published_coalition_id: coalition.id,
            metadata: {
              ...meta,
              review_status: "published",
              last_published_at: new Date().toISOString(),
              last_published_by: user.id,
            },
          })
          .eq("id", refreshedProgram.id);

        if (error) throw error;

        setMsg(
          "Program published successfully! It's now live and visible to applicants."
        );
      }

      // Navigate back to programs list after successful publish/submit
      setTimeout(() => {
        navigate(`/coalition/${coalitionSlug}/admin/programs`);
      }, 1500);
    } catch (e: any) {
      setMsg(e.message || "Publish failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!isUUID(programId)) return null; // Guard against undefined ID
  if (!coalition || !program) return <div>Loading...</div>;

  // Check if form should be disabled (when status is submitted)
  const meta = (program?.metadata ?? {}) as any;
  const status =
    typeof meta?.review_status === "string" ? meta.review_status : "draft";
  const isSubmitted = status === "submitted";
  const isDisabled = isSubmitted && !isEditing;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {program?.name || "Loading..."} - Edit Application
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {program?.description ? (
                  <>
                    <AutoLinkText text={program.description} />
                    {coalition?.name && ` · Coalition: ${coalition.name}`}
                  </>
                ) : (
                  <>
                    Program description
                    {coalition?.name && ` · Coalition: ${coalition.name}`}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/coalition/${coalition.slug}/cm/programs`}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Programs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Review note for coalition managers */}
      {(() => {
        const meta = (program?.metadata ?? {}) as any;
        const status =
          typeof meta?.review_status === "string"
            ? meta.review_status
            : "draft";
        const note =
          typeof meta?.review_note === "string" ? meta.review_note : null;
        if (status === "changes_requested" && note) {
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                <div className="font-semibold">Changes requested</div>
                <div className="text-sm">
                  <AutoLinkText text={note} preserveWhitespace={true} />
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Pending changes notification */}
      {(() => {
        const meta = (program?.metadata ?? {}) as any;
        const status =
          typeof meta?.review_status === "string"
            ? meta.review_status
            : "draft";
        if (status === "pending_changes") {
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                <div className="font-semibold">⏳ Changes Pending Approval</div>
                <div className="text-sm">
                  Your changes have been saved but require super admin approval
                  before going live. The current published version remains
                  active until approved.
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Disabled state notice for submitted programs */}
      {(() => {
        const meta = (program?.metadata ?? {}) as any;
        const status =
          typeof meta?.review_status === "string"
            ? meta.review_status
            : "draft";
        if (status === "submitted") {
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      Program submitted for review
                    </div>
                    <div className="text-sm">
                      This program has been submitted and is awaiting review.
                      You can view and edit the form as needed.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    {isEditing ? "Cancel Edit" : "Edit"}
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content - Approval Required Sections */}
          <div className="flex-1 min-w-0">
            {/* Approval Notice */}
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Note: changes to Common Application Options and Application
                  Builder require super admin approval
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>

            {/* Common Application Options */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-t-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h2 className="text-lg font-bold text-gray-900">
                  Common Application Options
                </h2>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:bg-blue-25 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600"
                    checked={includeCoalitionCommon}
                    onChange={(e) =>
                      setIncludeCoalitionCommon(e.target.checked)
                    }
                    disabled={isDisabled}
                  />
                  <span className="font-medium text-gray-700">
                    Include Coalition Common App (if available)
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:bg-blue-25 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600"
                    checked={includeProfile}
                    onChange={(e) => setIncludeProfile(e.target.checked)}
                    disabled={isDisabled}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">
                      Include Profile Autofill
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Applicants' profile information will be automatically
                      included in their applications
                    </p>
                  </div>
                </label>

                {/* Profile Section Checkboxes - Only show when Profile Autofill is enabled */}
                {includeProfile && (
                  <div className="ml-6 space-y-2 border-l-2 border-blue-200 pl-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Select which profile sections to include:
                    </div>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={includePersonalInfo}
                        onChange={(e) =>
                          setIncludePersonalInfo(e.target.checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          Personal Information
                        </span>
                        <p className="text-xs text-gray-500">
                          Name, birth date, address, phone number
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={includeFamilyInfo}
                        onChange={(e) => setIncludeFamilyInfo(e.target.checked)}
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          Family & Emergency Contact
                        </span>
                        <p className="text-xs text-gray-500">
                          Parent/guardian and emergency contact information
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={includeWritingInfo}
                        onChange={(e) =>
                          setIncludeWritingInfo(e.target.checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          Writing & Essays
                        </span>
                        <p className="text-xs text-gray-500">
                          Personal statement and written responses
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={includeExperienceInfo}
                        onChange={(e) =>
                          setIncludeExperienceInfo(e.target.checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          Experience & Portfolio
                        </span>
                        <p className="text-xs text-gray-500">
                          Resume and portfolio files
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Application Builder */}
            <div className="bg-green-50 border-2 border-green-200 border-t-0 rounded-b-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-900">
                  Application Builder
                </h2>
              </div>
              <p className="text-gray-600 mb-8">
                Add questions to your application form.
              </p>

              {/* Field Type Selection Section */}
              <div className="bg-white rounded-lg p-3 mb-4 shadow-sm border">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <button
                    onClick={() => addField("short_text")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">📝</div>
                    <span className="text-xs font-medium text-gray-700">
                      Short Text
                    </span>
                  </button>
                  <button
                    onClick={() => addField("long_text")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">📄</div>
                    <span className="text-xs font-medium text-gray-700">
                      Long Text
                    </span>
                  </button>
                  <button
                    onClick={() => addField("date")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">📅</div>
                    <span className="text-xs font-medium text-gray-700">
                      Date
                    </span>
                  </button>
                  <button
                    onClick={() => addField("select")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">📋</div>
                    <span className="text-xs font-medium text-gray-700">
                      Select
                    </span>
                  </button>
                  <button
                    onClick={() => addField("checkbox")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">☑️</div>
                    <span className="text-xs font-medium text-gray-700">
                      Checkbox
                    </span>
                  </button>
                  <button
                    onClick={() => addField("file")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full"
                    disabled={isDisabled}
                  >
                    <div className="text-lg">📎</div>
                    <span className="text-xs font-medium text-gray-700">
                      File Upload
                    </span>
                  </button>
                </div>
              </div>

              {/* Configured Questions Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Your Questions
                    </h3>
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {fields.length} question{fields.length !== 1 ? "s" : ""}{" "}
                    added
                  </div>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                    <div className="text-4xl mb-4">📝</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No questions yet
                    </h4>
                    <p className="text-gray-600">
                      Click the buttons above to add your first question
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map(
                        (field, idx) => field.key || `field-${idx}`
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {fields.map((field, idx) => (
                          <SortableField
                            key={field.key || `field-${idx}`}
                            field={field}
                            idx={idx}
                            isDisabled={isDisabled}
                            onUpdateField={handleUpdateField}
                            onRemoveField={handleRemoveField}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {/* Shared Action Buttons for Both Sections */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-gray-300 border-t-0 rounded-b-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Publish Program
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Publish your program to make it visible to applicants. You can
                make changes anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    <span className="text-lg">👁️</span>
                    Preview Application
                  </button>
                  <button
                    disabled={saving || isDisabled}
                    onClick={onSave}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    <span className="text-lg">{saving ? "⏳" : "💾"}</span>
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    disabled={saving || (isSubmitted && !isEditing)}
                    onClick={onPublish}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                    title="Publish this program to make it visible to applicants"
                  >
                    <span className="text-lg">🚀</span>
                    {program?.published
                      ? "Update Live Page"
                      : "Publish Program"}
                  </button>
                </div>

                {msg && (
                  <div className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg border">
                    {msg}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Reviewer Form Configuration */}
          <div className="w-80 flex-shrink-0">
            {/* Spacer to match approval notice height exactly - py-4 (32px) + inner py-2 (16px) + text height */}
            <div style={{ height: "68px" }}></div>
            <div className="sticky" style={{ top: "68px" }}>
              {program && <ProgramReviewerFormCard programId={program.id} />}
            </div>
          </div>
        </div>
      </div>

      <ApplicationPreview
        fields={fields}
        program={program as any}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
