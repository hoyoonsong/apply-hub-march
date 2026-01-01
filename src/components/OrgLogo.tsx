import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Shared cache for signed URLs to prevent duplicate requests across all OrgLogo instances
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
// Track pending requests to deduplicate concurrent calls
const pendingRequests = new Map<string, Promise<string | null>>();
// Track files that don't exist to avoid repeated failed requests
const missingFiles = new Set<string>();

// Extract file path from public URL
// Only handles new Logos bucket (old bucket has been removed)
export const extractFilePath = (publicUrl: string): string | null => {
  try {
    const url = new URL(publicUrl);
    // Extract path from Logos bucket (case-sensitive!)
    const logosMatch = url.pathname.match(
      /\/storage\/v1\/object\/public\/Logos\/(.+)/
    );
    if (logosMatch) {
      return logosMatch[1];
    }
    // If it's an old URL format, return null (old bucket no longer exists)
    return null;
  } catch {
    return null;
  }
};

// Check if a URL is a public URL that can be used directly
function isPublicUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Public URLs from Supabase storage have this pattern
    const isPublic = urlObj.pathname.includes("/storage/v1/object/public/");
    if (!isPublic) {
      console.log(
        "[OrgLogo] URL is not public:",
        url,
        "pathname:",
        urlObj.pathname
      );
    }
    return isPublic;
  } catch (err) {
    console.error("[OrgLogo] Error checking if URL is public:", url, err);
    return false;
  }
}

// Get or create signed URL with caching and request deduplication
async function getSignedUrl(
  logoUrl: string,
  expirySeconds: number = 60 * 60
): Promise<string | null> {
  const filePath = extractFilePath(logoUrl);
  if (!filePath) {
    return null;
  }

  // All logos are now in the Logos bucket
  const bucketName = "Logos";
  const actualFilePath = filePath;

  // Check cache first
  const cached = signedUrlCache.get(actualFilePath);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Check if there's already a pending request for this file
  const pending = pendingRequests.get(actualFilePath);
  if (pending) {
    return pending;
  }

  // Create a new request and store it as pending
  const requestPromise = (async () => {
    try {
      console.log(
        "[OrgLogo] Calling createSignedUrl for:",
        actualFilePath,
        "in bucket:",
        bucketName
      );
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(actualFilePath, expirySeconds);

      if (error) {
        // If file doesn't exist, mark it as missing to avoid repeated requests
        if (
          error.message?.includes("not found") ||
          error.message?.includes("Object not found")
        ) {
          console.log(
            "[OrgLogo] File not found, marking as missing:",
            actualFilePath
          );
          missingFiles.add(actualFilePath);
        } else {
          console.error("[OrgLogo] createSignedUrl error:", error);
        }
        throw error;
      }

      if (data?.signedUrl) {
        console.log("[OrgLogo] Successfully created signed URL");
        // Remove from missing files if it was previously marked as missing
        missingFiles.delete(actualFilePath);
        // Cache the URL (expire 5 minutes before actual expiry for safety)
        signedUrlCache.set(actualFilePath, {
          url: data.signedUrl,
          expiresAt: now + (expirySeconds - 300) * 1000,
        });
        return data.signedUrl;
      }
      console.error("[OrgLogo] No signed URL in response, data:", data);
      return null;
    } catch (err) {
      console.error("[OrgLogo] Error getting signed URL:", err);
      return null;
    } finally {
      // Remove from pending requests once done
      pendingRequests.delete(actualFilePath);
    }
  })();

  // Store the pending request
  pendingRequests.set(actualFilePath, requestPromise);

  return requestPromise;
}

// Batch pre-fetch multiple logos in parallel to populate cache
// This is useful when you know you'll need many logos (e.g., loading a list)
// OPTIMIZATION: Public URLs are used directly (no API call), only signed URLs need fetching
export async function batchPreFetchLogos(
  logoUrls: string[],
  expirySeconds: number = 60 * 60
): Promise<void> {
  const uniqueUrls = Array.from(
    new Set(logoUrls.filter((url) => url && url.trim()))
  );
  if (uniqueUrls.length === 0) return;

  // Get file paths and check cache
  const now = Date.now();
  const toFetch: string[] = [];

  uniqueUrls.forEach((logoUrl) => {
    // Skip public URLs - they can be used directly, no API call needed!
    if (isPublicUrl(logoUrl)) {
      return;
    }

    const filePath = extractFilePath(logoUrl);
    if (!filePath) return;

    const cached = signedUrlCache.get(filePath);
    if (!cached || cached.expiresAt <= now) {
      // Check if already pending
      if (!pendingRequests.has(filePath)) {
        toFetch.push(filePath);
      }
    }
  });

  if (toFetch.length === 0) return;

  // Fetch all in parallel
  const fetchPromises = toFetch.map((filePath) => {
    // Create request promise
    const requestPromise = (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("Logos")
          .createSignedUrl(filePath, expirySeconds);

        if (error) throw error;

        if (data?.signedUrl) {
          signedUrlCache.set(filePath, {
            url: data.signedUrl,
            expiresAt: now + (expirySeconds - 300) * 1000,
          });
          return data.signedUrl;
        }
        return null;
      } catch (err) {
        console.error(`Error pre-fetching logo ${filePath}:`, err);
        return null;
      } finally {
        pendingRequests.delete(filePath);
      }
    })();

    pendingRequests.set(filePath, requestPromise);
    return requestPromise;
  });

  // Wait for all to complete - cache will be populated before this resolves
  await Promise.all(fetchPromises).catch(() => {
    // Silently fail - individual components will handle errors
  });
}

interface OrgLogoProps {
  logoUrl: string | null;
  orgName: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showDownload?: boolean;
  showLabel?: boolean;
}

export default function OrgLogo({
  logoUrl,
  orgName,
  size = "md",
  className = "",
  showDownload = false,
  showLabel = false,
}: OrgLogoProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  const sizePixels = {
    sm: "32px",
    md: "48px",
    lg: "64px",
    xl: "96px",
  };

  useEffect(() => {
    if (!logoUrl || !logoUrl.trim()) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSignedUrl() {
      try {
        // TypeScript guard: logoUrl is already checked above, but we need to assert it here
        if (!logoUrl) return;

        const filePath = extractFilePath(logoUrl);

        if (!filePath) {
          // Can't extract path, try using URL directly anyway
          if (!cancelled) {
            setSignedUrl(logoUrl);
            setLoading(false);
          }
          return;
        }

        // Check if file is known to be missing
        if (missingFiles.has(filePath)) {
          console.log(
            "[OrgLogo] File is known to be missing, skipping:",
            filePath
          );
          if (!cancelled) {
            setSignedUrl(null);
            setLoading(false);
          }
          return;
        }

        // Since logos are public, use the public URL directly (no API call!)
        if (isPublicUrl(logoUrl)) {
          console.log(
            "[OrgLogo] Using public URL directly (no API call):",
            logoUrl
          );
          if (!cancelled) {
            setSignedUrl(logoUrl);
            setLoading(false);
          }
          return;
        }

        // Not a public URL, create signed URL
        console.log("[OrgLogo] Creating signed URL for:", filePath);
        setLoading(true);

        const url = await getSignedUrl(logoUrl, 60 * 60);

        if (cancelled) return;

        if (url) {
          setSignedUrl(url);
        } else {
          console.error("[OrgLogo] Failed to get signed URL");
          setSignedUrl(logoUrl); // Fallback to original
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[OrgLogo] Error loading logo:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const handleDownload = async () => {
    if (!logoUrl) return;

    try {
      const filePath = extractFilePath(logoUrl);
      if (!filePath) {
        alert("Invalid logo URL");
        return;
      }

      // All logos are now in the Logos bucket
      const bucketName = "Logos";
      const actualFilePath = filePath;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(actualFilePath, 60 * 10); // 10 minutes for download

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        // Fetch the image and trigger download
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${orgName.replace(/\s+/g, "_")}_logo.${filePath
          .split(".")
          .pop()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error downloading logo:", err);
      alert("Failed to download logo");
    }
  };

  const logoContent = (
    <>
      {!logoUrl || !logoUrl.trim() ? (
        <div
          className={`${sizeClasses[size]} bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center`}
        >
          <span className="text-xs text-gray-400">No logo</span>
        </div>
      ) : loading ? (
        <div
          className={`${sizeClasses[size]} bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center`}
        >
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      ) : !signedUrl ? (
        <div
          className={`${sizeClasses[size]} bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center`}
        >
          <span className="text-xs text-gray-400">No logo</span>
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} bg-white rounded-full border border-gray-300 flex items-center justify-center p-1 overflow-hidden`}
        >
          <img
            src={signedUrl}
            alt={`${orgName} logo`}
            className={`max-h-full max-w-full h-auto w-auto object-contain rounded-full`}
            style={{
              maxHeight: sizePixels[size],
              maxWidth: sizePixels[size],
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const currentUrl = target.src;

              // If public URL failed, try creating a signed URL as fallback (only if not already marked as missing)
              if (isPublicUrl(currentUrl) && logoUrl) {
                const filePath = extractFilePath(logoUrl);
                if (filePath && !missingFiles.has(filePath)) {
                  console.log(
                    "[OrgLogo] Public URL failed, falling back to signed URL"
                  );
                  // Create signed URL as fallback
                  getSignedUrl(logoUrl, 60 * 60)
                    .then((fallbackUrl) => {
                      if (fallbackUrl && fallbackUrl !== currentUrl) {
                        console.log("[OrgLogo] Using signed URL fallback");
                        target.src = fallbackUrl;
                        return; // Don't show error, try signed URL instead
                      }
                      // If signed URL also failed, mark as missing and show error
                      if (filePath) {
                        missingFiles.add(filePath);
                      }
                      showError();
                    })
                    .catch((err) => {
                      // If error is "not found", mark file as missing
                      if (
                        filePath &&
                        (err?.message?.includes("not found") ||
                          err?.message?.includes("Object not found"))
                      ) {
                        missingFiles.add(filePath);
                      }
                      showError();
                    });
                  return;
                } else if (filePath && missingFiles.has(filePath)) {
                  // File is already known to be missing, skip retry
                  showError();
                  return;
                }
              }

              showError();

              function showError() {
                // Only log error if not a known missing file (to reduce console noise)
                const filePath = extractFilePath(logoUrl || "");
                if (!filePath || !missingFiles.has(filePath)) {
                  console.log("[OrgLogo] Image failed to load:", currentUrl);
                }
                const container = target.parentElement;
                if (container) {
                  container.innerHTML = `<div class="${sizeClasses[size]} bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center"><span class="text-xs text-gray-400">No logo</span></div>`;
                }
              }
            }}
            onLoad={() => {
              console.log("[OrgLogo] Image loaded successfully:", signedUrl);
            }}
          />
        </div>
      )}
    </>
  );

  if (showLabel || showDownload) {
    return (
      <div className={`mb-3 ${className}`}>
        {showLabel && <span className="font-medium block mb-1">Logo:</span>}
        <div className="flex items-start gap-3">
          {logoContent}
          {showDownload && logoUrl && signedUrl && (
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-1.5 whitespace-nowrap"
              title="Download logo"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          )}
        </div>
      </div>
    );
  }

  return <div className={className}>{logoContent}</div>;
}
