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

  // Persist locally on every change
  useEffect(() => {
    const payload = JSON.stringify({
      answers,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(storageKey, payload);
  }, [answers, storageKey]);

  // Track last pushed payload to avoid redundant RPCs
  const lastPushed = useRef<string>("");

  const pushToServer = useMemo(() => {
    const debounced = (data: Answers) => {
      const json = JSON.stringify(data);
      if (json === lastPushed.current) return;
      saveApplication(applicationId, data)
        .then(() => {
          lastPushed.current = json;
        })
        .catch((e) => {
          console.warn("Autosave failed", e);
        });
    };

    let timeoutId: NodeJS.Timeout;
    return {
      call: (data: Answers) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => debounced(data), 30000); // Increased from 10s to 30s
      },
      flush: () => {
        clearTimeout(timeoutId);
        debounced(answers);
      },
      cancel: () => {
        clearTimeout(timeoutId);
      },
    };
  }, [applicationId, answers]);

  useEffect(() => {
    pushToServer.call(answers);
    return () => pushToServer.cancel();
  }, [answers, pushToServer]);

  useEffect(() => {
    const flush = () => pushToServer.flush();
    document.addEventListener("visibilitychange", flush, { passive: true });
    window.addEventListener("beforeunload", flush, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [pushToServer]);

  return { answers, setAnswers };
}
