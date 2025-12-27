import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  // Load capabilities when user is available
  useEffect(() => {
    if (!user) {
      // Clear capabilities when user logs out
      setCapabilities(null);
      setLoading(false);
      return;
    }

    let mounted = true;
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
      if (!document.hidden && user) {
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

