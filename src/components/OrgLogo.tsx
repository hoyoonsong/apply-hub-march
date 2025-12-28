import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Shared cache for signed URLs to prevent duplicate requests across all OrgLogo instances
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
// Track pending requests to deduplicate concurrent calls
const pendingRequests = new Map<string, Promise<string | null>>();

// Extract file path from public URL
export const extractFilePath = (publicUrl: string): string | null => {
  try {
    const url = new URL(publicUrl);
    const pathMatch = url.pathname.match(
      /\/storage\/v1\/object\/public\/application-files\/(.+)/
    );
    if (pathMatch) {
      return pathMatch[1];
    }
    return null;
  } catch {
    return null;
  }
};

// Get or create signed URL with caching and request deduplication
async function getSignedUrl(
  logoUrl: string,
  expirySeconds: number = 60 * 60
): Promise<string | null> {
  const filePath = extractFilePath(logoUrl);
  if (!filePath) {
    return null;
  }

  // Check cache first
  const cached = signedUrlCache.get(filePath);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Check if there's already a pending request for this file
  const pending = pendingRequests.get(filePath);
  if (pending) {
    return pending;
  }

  // Create a new request and store it as pending
  const requestPromise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from("application-files")
        .createSignedUrl(filePath, expirySeconds);

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        // Cache the URL (expire 5 minutes before actual expiry for safety)
        signedUrlCache.set(filePath, {
          url: data.signedUrl,
          expiresAt: now + (expirySeconds - 300) * 1000,
        });
        return data.signedUrl;
      }
      return null;
    } catch (err) {
      console.error("Error getting signed URL:", err);
      return null;
    } finally {
      // Remove from pending requests once done
      pendingRequests.delete(filePath);
    }
  })();

  // Store the pending request
  pendingRequests.set(filePath, requestPromise);

  return requestPromise;
}

// Batch pre-fetch multiple logos in parallel to populate cache
// This is useful when you know you'll need many logos (e.g., loading a list)
export async function batchPreFetchLogos(
  logoUrls: string[],
  expirySeconds: number = 60 * 60
): Promise<void> {
  const uniqueUrls = Array.from(new Set(logoUrls.filter(url => url && url.trim())));
  if (uniqueUrls.length === 0) return;

  // Get file paths and check cache
  const now = Date.now();
  const toFetch: string[] = [];
  
  uniqueUrls.forEach((logoUrl) => {
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
          .from("application-files")
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

  // Wait for all to complete (fire and forget - cache will be populated)
  Promise.all(fetchPromises).catch(() => {
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
      return;
    }

    let cancelled = false;

    async function loadSignedUrl() {
      try {
        setLoading(true);
        
        // Use cached function that handles deduplication
        const url = await getSignedUrl(logoUrl, 60 * 60); // 1 hour

        if (cancelled) return;

        if (url) {
          setSignedUrl(url);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading logo:", err);
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

      const { data, error } = await supabase.storage
        .from("application-files")
        .createSignedUrl(filePath, 60 * 10); // 10 minutes for download

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
        a.download = `${orgName.replace(/\s+/g, "_")}_logo.${filePath.split(".").pop()}`;
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
          className={`${sizeClasses[size]} bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center`}
        >
          <span className="text-xs text-gray-400">No logo</span>
        </div>
      ) : loading ? (
        <div
          className={`${sizeClasses[size]} bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center`}
        >
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      ) : !signedUrl ? (
        <div
          className={`${sizeClasses[size]} bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center`}
        >
          <span className="text-xs text-gray-400">No logo</span>
        </div>
      ) : (
        <div className={`${sizeClasses[size]} flex items-center justify-center`}>
          <img
            src={signedUrl}
            alt={`${orgName} logo`}
            className={`max-h-full max-w-full h-auto w-auto object-contain rounded-lg border border-gray-300`}
            style={{
              maxHeight: sizePixels[size],
              maxWidth: sizePixels[size],
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const container = target.parentElement;
              if (container) {
                container.innerHTML = `<div class="${sizeClasses[size]} bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center"><span class="text-xs text-gray-400">No logo</span></div>`;
              }
            }}
          />
        </div>
      )}
    </>
  );

  if (showLabel || showDownload) {
    return (
      <div className={`mb-3 ${className}`}>
        {showLabel && (
          <span className="font-medium block mb-1">Logo:</span>
        )}
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

