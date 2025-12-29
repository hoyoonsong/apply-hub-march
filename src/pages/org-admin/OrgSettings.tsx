import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { invalidateOrgCache } from "../../lib/orgCache";
import { supabase } from "../../lib/supabase";
import OrgAdminSidebar from "../../components/OrgAdminSidebar";
import OrgLogo, { extractFilePath } from "../../components/OrgLogo";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

export default function OrgSettings() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load organization data
  useEffect(() => {
    let mounted = true;

    async function loadOrg() {
      if (!orgSlug) {
        navigate("/unauthorized", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch organization data directly with all fields we need (including logo_url)
        // This avoids the double fetch: getOrgBySlug + separate query
        const { data, error: fetchError } = await supabase
          .from("organizations")
          .select("id, name, slug, description, logo_url")
          .eq("slug", orgSlug)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          navigate("/unauthorized", { replace: true });
          return;
        }

        if (!mounted) return;

        setOrg(data as Organization);
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description || "");
        setLogoUrl(data.logo_url);
      } catch (err) {
        if (!mounted) return;
        console.error("Error loading organization:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load organization"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrg();

    return () => {
      mounted = false;
    };
  }, [orgSlug, navigate]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload an image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo file size must be less than 5MB");
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload logo immediately
    await uploadLogo(file);
  };

  const uploadLogo = async (file: File) => {
    try {
      setUploadingLogo(true);
      setError(null);

      // Delete old logo if it exists
      if (logoUrl) {
        const oldFilePath = extractFilePath(logoUrl);
        if (oldFilePath) {
          const bucketName = "Logos";
          const filePath = oldFilePath;

          // Silently delete old logo - don't fail if it doesn't exist
          await supabase.storage
            .from(bucketName)
            .remove([filePath])
            .catch(() => {
              // Ignore errors - file might not exist
            });
        }
      }

      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${name.trim().replace(/\s+/g, "_") || org?.name.trim().replace(/\s+/g, "_") || "org"}_logo.${fileExt}`;

      // Upload to public logos bucket
      const { error: uploadError } = await supabase.storage
        .from("Logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL from public bucket
      const {
        data: { publicUrl },
      } = supabase.storage.from("Logos").getPublicUrl(fileName);

      setLogoUrl(publicUrl);
    } catch (err) {
      console.error("Error uploading logo:", err);
      setError(
        err instanceof Error
          ? `Failed to upload logo: ${err.message}`
          : "Failed to upload logo"
      );
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !name.trim() || !slug.trim()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate slug format (alphanumeric, hyphens, underscores only)
      const slugRegex = /^[a-z0-9_-]+$/;
      if (!slugRegex.test(slug.trim())) {
        setError(
          "Slug can only contain lowercase letters, numbers, hyphens, and underscores"
        );
        setSaving(false);
        return;
      }

      // If logo was removed (logoUrl is null but org had a logo), delete the old logo file
      const oldLogoUrl = org.logo_url;
      const newLogoUrl = logoUrl;
      if (oldLogoUrl && !newLogoUrl) {
        const oldFilePath = extractFilePath(oldLogoUrl);
        if (oldFilePath) {
          const bucketName = "Logos";
          const filePath = oldFilePath;

          // Silently delete old logo - don't fail if it doesn't exist
          await supabase.storage
            .from(bucketName)
            .remove([filePath])
            .catch(() => {
              // Ignore errors - file might not exist
            });
        }
      }

      const newSlug = slug.trim();
      const slugChanged = newSlug !== orgSlug;

      // Update organization directly via Supabase
      // First, do the update without select to avoid RLS issues
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name: name.trim(),
          slug: newSlug,
          description: description.trim() || null,
          logo_url: logoUrl || null,
        })
        .eq("id", org.id);

      if (updateError) {
        console.error("Update error details:", updateError);
        console.error("Error code:", updateError.code);
        console.error("Error message:", updateError.message);
        console.error("Error status:", updateError.status);
        
        // Check if it's a permissions/RLS error
        if (
          updateError.code === "42501" ||
          updateError.code === "PGRST301" ||
          updateError.message?.includes("permission denied") ||
          updateError.message?.includes("new row violates row-level security") ||
          updateError.message?.includes("violates row-level security") ||
          updateError.status === 403 ||
          updateError.status === 406
        ) {
          throw new Error(
            "You don't have permission to update this organization. This usually means the database permissions haven't been set up yet. Please contact support or run the SQL migration: add_org_update_policy.sql"
          );
        }
        
        // Check if it's a unique constraint violation (duplicate slug)
        if (
          updateError.code === "23505" ||
          updateError.message?.includes("duplicate key") ||
          updateError.message?.includes("unique constraint")
        ) {
          throw new Error(
            "An organization with this slug already exists. Please choose a different slug."
          );
        }
        
        throw new Error(
          updateError.message || "Failed to update organization"
        );
      }

      // After update, we can skip the fetch since we know what we updated
      // Just use the values we set (this avoids an extra DB call)
      const updatedOrg = {
        id: org.id,
        name: name.trim(),
        slug: newSlug,
        description: description.trim() || null,
        logo_url: logoUrl || null,
      } as Organization;


      // Invalidate cache for both old and new slugs
      if (slugChanged && orgSlug) {
        invalidateOrgCache(orgSlug);
      }
      invalidateOrgCache(newSlug);

      if (slugChanged) {
        setSuccess(
          "Organization updated successfully. Redirecting to new URL..."
        );
        // Update local state immediately with the new data
        setOrg(updatedOrg as Organization);
        // Redirect after a short delay to allow the cache to clear
        setTimeout(() => {
          navigate(`/org/${newSlug}/admin/settings`, { replace: true });
        }, 300);
      } else {
        // Update local state with the new data
        setOrg(updatedOrg as Organization);
        setSuccess("Organization updated successfully");
      }
    } catch (err) {
      console.error("Error updating organization:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update organization"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <OrgAdminSidebar orgId={org?.id} currentPath={location.pathname} />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Organization Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your organization details
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-gray-600 font-medium">Loading…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <OrgAdminSidebar orgId={org.id} currentPath={location.pathname} />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Organization Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your organization details
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Form */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Organization Details
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo
                    </label>
                    {logoPreview || logoUrl ? (
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-32 w-32 object-contain rounded-lg border border-gray-300"
                            />
                          ) : logoUrl ? (
                            <OrgLogo
                              logoUrl={logoUrl}
                              orgName={name || org.name}
                              size="xl"
                            />
                          ) : null}
                          {uploadingLogo && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <div className="text-white text-sm">
                                Uploading...
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleLogoChange}
                            disabled={saving || uploadingLogo}
                            className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            disabled={saving || uploadingLogo}
                            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Remove logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleLogoChange}
                          disabled={saving || uploadingLogo}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Upload a logo image (JPEG, PNG, GIF, or WebP, max
                          5MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Name and Slug */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Organization name"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase())}
                        className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="organization-slug"
                        required
                        disabled={saving}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Lowercase letters, numbers, hyphens, and underscores only.
                        Changing this will update your organization URL.
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Organization description"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      // Reset form to original values
                      if (org) {
                        setName(org.name);
                        setSlug(org.slug);
                        setDescription(org.description || "");
                        setLogoUrl(org.logo_url);
                        setLogoPreview(null);
                        setError(null);
                        setSuccess(null);
                      }
                    }}
                    disabled={saving || uploadingLogo}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingLogo}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    {saving
                      ? "Saving..."
                      : uploadingLogo
                      ? "Uploading logo..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

