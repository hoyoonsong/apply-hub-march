import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  getBuilderSchema,
  setBuilderSchema,
  type ApplicationSchema,
} from "../../data/api";
import {
  orgSubmitProgramForReview,
  type ProgramApplicationDraft,
  getCoalitionTemplate,
} from "../../lib/programs";
import type {
  ProgramApplicationSchema,
  AppItem,
} from "../../types/application";
import OptionsInput from "../../components/OptionsInput";
import ApplicationPreview from "../../components/ApplicationPreview";
import ProgramReviewerFormCard from "../../components/ProgramReviewerFormCard";
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

type Org = { id: string; slug: string; name: string };

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
      <div className="flex items-center justify-between mb-4">
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
                  Max characters:
                </label>
                <input
                  className="w-20 border border-gray-300 rounded px-2 py-2 text-sm disabled:opacity-50 disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="number"
                  placeholder="500"
                  value={field.maxLength ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                      ? Number(e.target.value)
                      : undefined;
                    onUpdateField(idx, { maxLength: val });
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

export default function OrgProgramBuilder() {
  const params = useParams();
  const navigate = useNavigate();
  const orgSlug = useMemo(() => (params?.orgSlug as string) || "", [params]);
  const programId = useMemo(
    () => (params?.programId as string) || "",
    [params]
  );

  // Check if this is being accessed as a super admin (no orgSlug in params)
  const isSuperAdmin = !orgSlug;

  const [org, setOrg] = useState<Org | null>(null);
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
  const [schema, setSchema] = useState<ApplicationSchema>({ fields: [] });
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

  // Function to handle edit button click
  const handleEditClick = async () => {
    if (!program) return;

    try {
      // If program is submitted, revert it to draft first
      const meta = (program?.metadata ?? {}) as any;
      const currentStatus =
        typeof meta?.review_status === "string" ? meta.review_status : "draft";

      if (currentStatus === "submitted") {
        const { error: updateError } = await supabase
          .from("programs")
          .update({
            metadata: {
              ...meta,
              review_status: "draft",
            },
          })
          .eq("id", program.id);

        if (updateError) throw new Error(updateError.message);

        // Update the program state
        setProgram({
          ...program,
          metadata: {
            ...meta,
            review_status: "draft",
          },
        });
      }

      setIsEditing(true);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };
  const [loading, setLoading] = useState(true);

  // load org
  useEffect(() => {
    (async () => {
      if (isSuperAdmin) {
        // For super admin, we'll load org from program data later
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id,slug,name")
        .eq("slug", orgSlug)
        .single();
      if (error || !data) return navigate("/unauthorized");
      setOrg(data);
    })();
  }, [orgSlug, navigate, isSuperAdmin]);

  // load program and schema
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!programId) return;
      try {
        // Load program details
        const { data, error } = await supabase.rpc("org_get_program_v1", {
          p_program_id: programId,
        });

        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          return navigate("/unauthorized");
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (mounted) {
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

          // For super admin, load org data from program
          if (isSuperAdmin && !org) {
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("id,slug,name")
              .eq("id", row.organization_id)
              .single();

            if (!orgError && orgData) {
              setOrg(orgData);
            }
          }
        }

        // Load builder schema separately
        try {
          let s;
          if (isSuperAdmin) {
            // For super admin, get schema from programs_public table
            const { data: programData, error: programError } = await supabase
              .from("programs_public")
              .select("application_schema")
              .eq("id", programId)
              .single();

            if (!programError && programData) {
              s = programData.application_schema;
            } else {
              // Fallback to program metadata
              const appMeta = row.metadata?.application || {};
              if (appMeta.schema) {
                s = appMeta.schema;
              } else {
                // Last resort - try RPC call
                s = await getBuilderSchema(programId);
              }
            }
          } else {
            s = await getBuilderSchema(programId);
          }

          if (mounted) {
            // Check if there are pending changes to load instead of live schema
            const meta = (row?.metadata ?? {}) as any;
            const hasPendingChanges = meta?.review_status === "pending_changes";
            const pendingSchema = meta?.pending_schema;

            if (hasPendingChanges && pendingSchema) {
              // Load pending changes for editing
              setSchema(pendingSchema);
              const loadedFields = pendingSchema?.fields || [];
              const fieldsWithKeys = loadedFields.map((field, idx) => ({
                ...field,
                key: field.key || `field-${idx}-${Date.now()}`,
              }));
              setFields(fieldsWithKeys);
            } else {
              // Load live schema
              setSchema(s ?? { fields: [] });
              const loadedFields = s?.fields || [];
              const fieldsWithKeys = loadedFields.map((field, idx) => ({
                ...field,
                key: field.key || `field-${idx}-${Date.now()}`,
              }));
              setFields(fieldsWithKeys);
            }
          }
        } catch (e) {
          // First time - no schema exists yet, or RPC failed for super admin
          if (mounted) {
            setSchema({ fields: [] });
            setFields([]);
          }
        }
      } catch (e: any) {
        if (mounted) {
          console.error("Failed to load program:", e);
          navigate("/unauthorized");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [programId, navigate]);

  // simple field add helper
  function addField(type: AppItem["type"]) {
    const label = type
      .replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const key = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newFields = [...fields, { type, label, key, required: false }];
    setFields(newFields);
    setSchema({ fields: newFields });
  }

  async function onSave() {
    if (!programId) return;
    setSaving(true);
    setMsg(null);
    try {
      const updatedSchema = {
        fields: fields,
      };

      // Check if program is published - try multiple ways to determine this
      const isPublished =
        program?.published ||
        program?.metadata?.published ||
        program?.metadata?.review_status === "published";

      console.log("Save - isPublished:", isPublished);
      console.log("Save - program.published:", program?.published);
      console.log("Save - program.metadata:", program?.metadata);

      // Check if program is published
      if (isPublished) {
        // If published, save changes as draft and mark as pending
        // Don't update the live schema - keep it separate
        const meta = (program?.metadata ?? {}) as any;
        console.log(
          "Saving pending changes for published program:",
          program?.id
        );
        console.log("Current metadata:", meta);

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
              pending_changes_by: "org_admin",
              // Update form flags
              form: {
                ...(meta.form || {}),
                include_profile: includeProfile,
                include_coalition_common_app: includeCoalitionCommon,
              },
              // Update application flags
              application: {
                ...(meta.application || {}),
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

        console.log("Successfully saved pending changes");

        setMsg(
          "Changes saved as draft! These changes require super admin approval before going live."
        );
      } else {
        // If not published, save normally to the live schema
        await setBuilderSchema(programId, updatedSchema);
        setSchema(updatedSchema);

        // Also update the program metadata with form flags
        const { error: metaError } = await supabase
          .from("programs")
          .update({
            metadata: {
              ...meta,
              form: {
                ...(meta.form || {}),
                include_profile: includeProfile,
                include_coalition_common_app: includeCoalitionCommon,
              },
              application: {
                ...(meta.application || {}),
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

        if (metaError) {
          console.error("Failed to update metadata:", metaError);
        }

        setMsg("Saved!");
      }
    } catch (e: any) {
      console.error("Save error:", e);
      setMsg(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitForReview() {
    if (!program || !programId) return;
    setSaving(true);
    setMsg(null);
    try {
      // First, save the current changes to ensure super admin sees latest version
      console.log("Auto-saving current changes before submit...");
      await onSave();

      const meta = (program?.metadata ?? {}) as any;
      const hasPendingChanges = meta?.review_status === "pending_changes";

      if (hasPendingChanges) {
        // For pending changes, just submit the existing pending schema
        console.log("Submitting pending changes for review...");
        const result = await orgSubmitProgramForReview({
          program_id: program.id,
          note: "Pending changes submitted for review",
        });
        console.log("Submit result:", result);
        setMsg(
          "Pending changes submitted for review. Superadmin will review & publish."
        );
      } else {
        // For new submissions, submit for review (onSave already handled the saving)
        await orgSubmitProgramForReview({
          program_id: program.id,
          note: "Program submitted for review",
        });
        setMsg("Submitted for review. Superadmin will review & publish.");
      }

      // Navigate back to programs list after successful submission
      setTimeout(() => {
        if (isSuperAdmin) {
          navigate("/super/programs");
        } else {
          navigate(`/org/${org?.slug}/admin/programs`);
        }
      }, 1500);
    } catch (e: any) {
      setMsg(e.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!programId) return <div className="p-6">Loading…</div>;
  if (loading) return <div className="p-6">Loading builder…</div>;
  if (!org) return <div className="p-6">Loading organization…</div>;
  if (!program) return <div className="p-6">Loading program…</div>;

  // Check if form should be disabled (when status is submitted or for super admin view)
  const meta = (program?.metadata ?? {}) as any;
  const status =
    typeof meta?.review_status === "string" ? meta.review_status : "draft";
  const isSubmitted = status === "submitted";
  const hasPendingChanges = status === "pending_changes";
  const isDisabled = isSuperAdmin || (isSubmitted && !isEditing);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {program?.name || "Loading..."} - Edit Application
              </h1>
              <p className="text-gray-600 mb-4">
                {program?.description || "Program description"}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Organization:</span>
                <span className="font-medium">{org?.name || "Loading..."}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={
                  isSuperAdmin
                    ? "/super/programs"
                    : `/org/${org?.slug}/admin/programs`
                }
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Programs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Review note for org admins */}
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
                <div className="text-sm whitespace-pre-wrap">{note}</div>
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
                    onClick={
                      isEditing ? () => setIsEditing(false) : handleEditClick
                    }
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

      <div className="max-w-6xl mx-auto mt-6 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Toggles */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">
              Common Application Options
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:bg-blue-25 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600"
                checked={includeCoalitionCommon}
                onChange={(e) => setIncludeCoalitionCommon(e.target.checked)}
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
                  Applicants' profile information will be automatically included
                  in their applications
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
                    onChange={(e) => setIncludePersonalInfo(e.target.checked)}
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
                    onChange={(e) => setIncludeWritingInfo(e.target.checked)}
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
                    onChange={(e) => setIncludeExperienceInfo(e.target.checked)}
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

        {/* Builder */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">
              Application Builder
            </h2>
          </div>

          {/* Field Type Selection Section */}
          {!isSuperAdmin && (
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
          )}

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
                {fields.length} question{fields.length !== 1 ? "s" : ""} added
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

          {/* Action Buttons */}
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 font-medium"
                >
                  <span className="text-lg">👁️</span>
                  Preview Application
                </button>
                {!isSuperAdmin && (
                  <>
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
                      onClick={onSubmitForReview}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                      title={
                        hasPendingChanges
                          ? "Submit pending changes for super admin review"
                          : ""
                      }
                    >
                      <span className="text-lg">📤</span>
                      {hasPendingChanges
                        ? "Submit Pending Changes for Review"
                        : isSubmitted
                        ? "Resubmit for Review"
                        : "Submit for Review"}
                    </button>
                  </>
                )}
              </div>

              {msg && (
                <div className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg border">
                  {msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviewer Form Configuration */}
      {program && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <ProgramReviewerFormCard programId={program.id} />
        </div>
      )}

      <ApplicationPreview
        fields={fields}
        program={program}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
