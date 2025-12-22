import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

/**
 * Hook to check for unread notifications
 * Optimized to reduce database load:
 * - Uses realtime subscriptions (no polling)
 * - Debounces database queries
 * - Ensures proper cleanup to prevent duplicate subscriptions
 * - Only checks on mount and when explicitly needed
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setHasUnread(false);
      setLoading(false);
      return;
    }

    // Cleanup any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Debounced check function to avoid rapid queries
    const checkUnread = async () => {
      try {
        // Use efficient query - just check if at least one unread exists
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);

        if (!error) {
          setHasUnread((count ?? 0) > 0);
        }
      } catch (error) {
        console.error("Error checking unread notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkUnread();

    // Debounced re-check function
    const debouncedCheck = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      checkTimeoutRef.current = setTimeout(() => {
        checkUnread();
      }, 500); // Wait 500ms before checking
    };

    // Debounced immediate check - waits a short time to handle batch updates
    // This ensures that when multiple notifications are marked as read at once,
    // we only check once after all updates have been processed
    const debouncedImmediateCheck = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      // Use a short delay (100ms) to allow batch updates to complete
      // This prevents race conditions when multiple notifications are updated at once
      checkTimeoutRef.current = setTimeout(() => {
        checkUnread();
      }, 100);
    };

    // Subscribe to new notifications (realtime - no database queries)
    // Use a unique channel name per user to prevent conflicts
    const channel = supabase
      .channel(`unread_notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Immediately show dot when new notification arrives
          // Only show if it's unread (read_at is null)
          if (!payload.new?.read_at) {
            setHasUnread(true);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Check if notification was marked as read (read_at changed from null to a value)
          const wasMarkedAsRead = !payload.old?.read_at && payload.new?.read_at;
          
          if (wasMarkedAsRead) {
            // Use debounced check to handle batch updates properly
            // When multiple notifications are marked as read at once, this ensures
            // we only check once after all updates have been processed
            // The 100ms delay allows the database transaction to complete and
            // prevents race conditions from rapid-fire UPDATE events
            debouncedImmediateCheck();
          } else {
            // For other updates, check if we need to update the dot
            // If a notification became unread (unlikely but handle it)
            const becameUnread = payload.old?.read_at && !payload.new?.read_at;
            if (becameUnread) {
              setHasUnread(true);
            } else {
              // Debounced check for other updates (only if needed)
              debouncedCheck();
            }
          }
        }
      )
      .subscribe((status) => {
        // Log subscription status for debugging (only in dev)
        if (process.env.NODE_ENV === "development") {
          if (status === "SUBSCRIBED") {
            console.log("✅ Notification subscription active");
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Notification subscription error");
          }
        }
      });

    // Store channel reference
    channelRef.current = channel;

    return () => {
      // Cleanup: clear timeout and remove channel
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return { hasUnread, loading };
}

