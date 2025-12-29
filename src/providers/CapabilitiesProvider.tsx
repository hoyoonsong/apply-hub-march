import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { loadCapabilities, type Capabilities } from "../lib/capabilities";
import { useAuth } from "../auth/AuthProvider";

type CapabilitiesContext = {
  capabilities: Capabilities | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CapabilitiesContext = createContext<CapabilitiesContext>({
  capabilities: null,
  loading: true,
  refresh: async () => {},
});

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false); // Prevent duplicate concurrent loads

  // Load capabilities when user is available (skip on super admin routes)
  useEffect(() => {
    if (!user) {
      // Clear capabilities when user logs out
      setCapabilities(null);
      setLoading(false);
      return;
    }

    // Skip capabilities loading on super admin routes
    // Check pathname inside effect since we're outside Router context
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    if (pathname.startsWith("/super")) {
      setCapabilities(null);
      setLoading(false);
      return;
    }

    // Prevent duplicate concurrent loads
    if (loadingRef.current) {
      return;
    }

    let mounted = true;
    loadingRef.current = true;
    setLoading(true);

    const loadCaps = async () => {
      try {
        const caps = await loadCapabilities();
        if (mounted) {
          setCapabilities(caps);
        }
      } catch (error) {
        console.error("Failed to load capabilities:", error);
        if (mounted) {
          setCapabilities(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        loadingRef.current = false;
      }
    };

    loadCaps();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only reload when user ID changes

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      // Skip if on super admin route
      if (document.hidden || window.location.pathname.startsWith("/super")) {
        return;
      }
      
      if (user) {
        try {
          const caps = await loadCapabilities();
          setCapabilities(caps);
        } catch (error) {
          console.error("Failed to refresh capabilities:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user?.id]);

  const refresh = async () => {
    try {
      const caps = await loadCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error("Failed to refresh capabilities:", error);
      setCapabilities(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CapabilitiesContext.Provider value={{ capabilities, loading, refresh }}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useCapabilitiesContext() {
  return useContext(CapabilitiesContext);
}

