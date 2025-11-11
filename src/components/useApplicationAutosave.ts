// components/useApplicationAutosave.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { saveApplication } from "../lib/rpc";

type Answers = Record<string, any>;

export function useApplicationAutosave(
  applicationId: string,
  initialServerAnswers: Answers,
  initialServerUpdatedAt?: string
) {
  const storageKey = `app:${applicationId}:answers`;

  const [answers, setAnswers] = useState<Answers>(() => {
    try {
      const local = localStorage.getItem(storageKey);
      if (!local) return initialServerAnswers || {};
      const parsed = JSON.parse(local) as {
        answers: Answers;
        updatedAt: string;
      };
      const serverAt = initialServerUpdatedAt
        ? new Date(initialServerUpdatedAt).getTime()
        : 0;
      const localAt = parsed?.updatedAt
        ? new Date(parsed.updatedAt).getTime()
        : 0;
      return localAt > serverAt
        ? parsed.answers || {}
        : initialServerAnswers || {};
    } catch {
      return initialServerAnswers || {};
    }
  });

  // Track save status for UI feedback
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastPushed = useRef<string>("");
  const lastActivityTime = useRef<number>(Date.now());
  const pendingSave = useRef<Answers | null>(null);
  const isOnline = useRef<boolean>(navigator.onLine);

  // Persist locally on every change (instant, no DB load)
  useEffect(() => {
    const payload = JSON.stringify({
      answers,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(storageKey, payload);
  }, [answers, storageKey]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      // Flush pending save when coming back online
      if (pendingSave.current) {
        const data = pendingSave.current;
        pendingSave.current = null;
        saveApplication(applicationId, data)
          .then(() => {
            lastPushed.current = JSON.stringify(data);
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          })
          .catch((e) => {
            console.warn("Autosave failed after reconnect", e);
            setSaveStatus("error");
            pendingSave.current = data; // Keep in queue for retry
          });
      }
    };
    const handleOffline = () => {
      isOnline.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [applicationId]);

  const pushToServer = useMemo(() => {
    const performSave = async (data: Answers) => {
      const json = JSON.stringify(data);
      
      // Skip if unchanged
      if (json === lastPushed.current) {
        setSaveStatus("saved");
        return;
      }

      // Skip if offline - queue for later
      if (!isOnline.current) {
        pendingSave.current = data;
        setSaveStatus("error");
        return;
      }

      setSaveStatus("saving");
      try {
        await saveApplication(applicationId, data);
        lastPushed.current = json;
        setSaveStatus("saved");
        pendingSave.current = null;
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        console.warn("Autosave failed", e);
        setSaveStatus("error");
        pendingSave.current = data; // Queue for retry
      }
    };

    let fastTimeoutId: NodeJS.Timeout | null = null;
    let slowTimeoutId: NodeJS.Timeout | null = null;

    return {
      call: (data: Answers) => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTime.current;
        lastActivityTime.current = now;

        // Clear any pending timeouts
        if (fastTimeoutId) clearTimeout(fastTimeoutId);
        if (slowTimeoutId) clearTimeout(slowTimeoutId);

        // Activity-based debouncing:
        // - If user is actively typing (changes within 5s), save after 3s of inactivity
        // - If user is idle (no changes for 5s+), save after 15s of inactivity
        // This reduces DB load while keeping recent changes safe
        if (timeSinceLastActivity < 5000) {
          // Active typing: save after 3s of inactivity
          fastTimeoutId = setTimeout(() => performSave(data), 3000);
        } else {
          // Idle: save after 15s (longer delay when not actively working)
          slowTimeoutId = setTimeout(() => performSave(data), 15000);
        }
      },
      flush: () => {
        if (fastTimeoutId) clearTimeout(fastTimeoutId);
        if (slowTimeoutId) clearTimeout(slowTimeoutId);
        performSave(answers);
      },
      cancel: () => {
        if (fastTimeoutId) clearTimeout(fastTimeoutId);
        if (slowTimeoutId) clearTimeout(slowTimeoutId);
      },
    };
  }, [applicationId, answers]);

  useEffect(() => {
    pushToServer.call(answers);
    return () => pushToServer.cancel();
  }, [answers, pushToServer]);

  // Flush on visibility change and beforeunload
  useEffect(() => {
    const flush = () => pushToServer.flush();
    document.addEventListener("visibilitychange", flush, { passive: true });
    window.addEventListener("beforeunload", flush, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [pushToServer]);

  return { answers, setAnswers, saveStatus };
}
