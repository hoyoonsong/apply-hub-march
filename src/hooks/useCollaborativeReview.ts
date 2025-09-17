import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "../lib/supabase-browser";
import type { ReviewGetRow } from "../types/reviews";
import { getProgramReviewForm } from "../lib/api";

type LoaderRow = ReviewGetRow & {
  application_schema?: any;
};

type ReviewFormConfig = {
  show_score: boolean;
  show_comments: boolean;
  show_decision: boolean;
  decision_options: string[];
};

export function useCollaborativeReview(appId: string) {
  const supabase = createClient();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [review, setReview] = useState<ReviewGetRow["review"]>({});
  const [applicationSchema, setApplicationSchema] = useState<any>({
    fields: [],
  });
  const [reviewFormConfig, setReviewFormConfig] = useState<ReviewFormConfig>({
    show_score: true,
    show_comments: true,
    show_decision: false,
    decision_options: ["accept", "waitlist", "reject"],
  });
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  // ---------- MAIN LOAD FUNCTION ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try the new RPC first
      const { data, error } = await supabase.rpc("review_get_v1", {
        p_application_id: appId,
      });

      if (error) {
        console.error("review_get_v1 error:", error);
        // Fallback to direct queries if RPC fails
        await loadWithDirectQueries();
        return;
      }

      console.log("review_get_v1 data:", data);
      const row: LoaderRow | undefined = data?.[0];
      console.log("Row data:", row);
      console.log("Applicant answers:", row?.applicant_answers);
      console.log("Application schema:", row?.application_schema);
      console.log(
        "🔍 Debug - Profile in applicant_answers:",
        row?.applicant_answers?.profile
      );
      setAnswers((row?.applicant_answers as any) ?? {});

      // If RPC doesn't return application_schema, fetch it from program metadata
      let schema = (row?.application_schema as any) ?? {};
      if (!schema || Object.keys(schema).length === 0) {
        console.log("No schema from RPC, fetching from program metadata...");
        try {
          // Get the program_id from the row data
          const programId = row?.program_id;
          if (programId) {
            const { data: programData, error: programError } = await supabase
              .from("programs")
              .select("id, name, description, organization_id, metadata")
              .eq("id", programId)
              .single();

            if (!programError && programData) {
              schema = programData.metadata?.application_schema ?? {};
              setProgram(programData);
              console.log("Fetched schema from program:", schema);
            } else {
              console.error("Error fetching program schema:", programError);
            }
          }
        } catch (err) {
          console.error("Error fetching schema from program:", err);
        }
      }
      setApplicationSchema(schema);
      const r = (row?.review as any) ?? {};

      // Load reviewer form configuration
      try {
        const programId = row?.program_id;
        if (programId) {
          console.log("Loading reviewer form config for program:", programId);
          const formConfig = await getProgramReviewForm(programId);
          console.log("Loaded reviewer form config:", formConfig);
          if (formConfig) {
            setReviewFormConfig({
              show_score: true,
              show_comments: true,
              show_decision: false,
              decision_options: ["accept", "waitlist", "reject"],
              ...formConfig,
            });
          }
        }
      } catch (err) {
        console.error("Error loading reviewer form config:", err);
        // Continue with defaults
      }

      // Always ensure we have a reviewer name - fetch if missing
      let reviewerName = r.reviewer_name;
      if (!reviewerName && r.reviewer_id) {
        console.log("Fetching reviewer name for ID:", r.reviewer_id);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", r.reviewer_id)
            .single();

          if (!profileError && profileData?.full_name) {
            reviewerName = profileData.full_name;
            console.log("Successfully fetched reviewer name:", reviewerName);
          } else {
            // Use reviewer_id as fallback instead of "Unknown User"
            reviewerName = r.reviewer_id;
            console.log("Using reviewer_id as fallback:", reviewerName);
          }
        } catch (err) {
          console.error("Error fetching reviewer name:", err);
          // Use reviewer_id as fallback instead of "Unknown User"
          reviewerName = r.reviewer_id;
        }
      } else if (!reviewerName && !r.reviewer_id) {
        // No reviewer at all - use a generic message
        reviewerName = "No reviewer assigned";
      }

      // Extract decision from ratings JSON if present
      const ratings = r.ratings ?? {};
      const decision = ratings.decision ?? (r as any)?.decision ?? null;

      setReview((prev) => ({
        application_id: appId,
        score: r.score ?? prev.score ?? null,
        comments: r.comments ?? prev.comments ?? "",
        ratings: ratings,
        decision: decision,
        status: r.status ?? prev.status ?? "draft",
        id: r.id ?? prev.id,
        reviewer_id: r.reviewer_id ?? prev.reviewer_id,
        reviewer_name: reviewerName ?? prev.reviewer_name,
        submitted_at: r.submitted_at ?? prev.submitted_at,
        updated_at: r.updated_at ?? prev.updated_at,
        created_at: r.created_at ?? prev.created_at,
      }));

      setLoading(false);
    } catch (err) {
      console.error("Error in review_get_v1:", err);
      await loadWithDirectQueries();
    }
  }, [appId]);

  // ---------- FALLBACK LOAD (Direct queries) ----------
  async function loadWithDirectQueries() {
    try {
      // Load application data directly
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("answers, program_id")
        .eq("id", appId)
        .single();

      if (appError) {
        console.error("Error loading application:", appError);
        setError("Failed to load application data");
        setLoading(false);
        return;
      }

      setAnswers(appData?.answers ?? {});

      // Load review data directly
      const { data: reviewData, error: reviewError } = await supabase
        .from("application_reviews")
        .select("*")
        .eq("application_id", appId)
        .single();

      if (reviewError && reviewError.code !== "PGRST116") {
        console.error("Error loading review:", reviewError);
      }

      // Load schema from program
      let schema = {};
      if (appData?.program_id) {
        try {
          const { data: programData, error: programError } = await supabase
            .from("programs")
            .select("id, name, description, organization_id, metadata")
            .eq("id", appData.program_id)
            .single();

          if (!programError && programData) {
            schema = programData.metadata?.application_schema ?? {};
            setProgram(programData);
            console.log("Fetched schema from program (fallback):", schema);
          }
        } catch (err) {
          console.error("Error fetching program schema (fallback):", err);
        }
      }

      // Set the data
      setAnswers(appData?.answers ?? {});
      setApplicationSchema(schema);
      const r = reviewData ?? {};

      // Load reviewer form configuration (fallback)
      try {
        const programId = appData?.program_id;
        if (programId) {
          console.log(
            "Loading reviewer form config for program (fallback):",
            programId
          );
          const formConfig = await getProgramReviewForm(programId);
          console.log("Loaded reviewer form config (fallback):", formConfig);
          if (formConfig) {
            setReviewFormConfig({
              show_score: true,
              show_comments: true,
              show_decision: false,
              decision_options: ["accept", "waitlist", "reject"],
              ...formConfig,
            });
          }
        }
      } catch (err) {
        console.error("Error loading reviewer form config (fallback):", err);
        // Continue with defaults
      }

      // Always ensure we have a reviewer name - fetch if missing
      let reviewerName = r.reviewer_name;
      if (!reviewerName && r.reviewer_id) {
        console.log("Fetching reviewer name (fallback) for ID:", r.reviewer_id);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", r.reviewer_id)
            .single();

          if (!profileError && profileData?.full_name) {
            reviewerName = profileData.full_name;
            console.log(
              "Successfully fetched reviewer name (fallback):",
              reviewerName
            );
          } else {
            // Use reviewer_id as fallback instead of "Unknown User"
            reviewerName = r.reviewer_id;
            console.log(
              "Using reviewer_id as fallback (fallback):",
              reviewerName
            );
          }
        } catch (err) {
          console.error("Error fetching reviewer name (fallback):", err);
          // Use reviewer_id as fallback instead of "Unknown User"
          reviewerName = r.reviewer_id;
        }
      } else if (!reviewerName && !r.reviewer_id) {
        // No reviewer at all - use a generic message
        reviewerName = "No reviewer assigned";
      }

      // Extract decision from ratings JSON if present (fallback)
      const ratings = r.ratings ?? {};
      const decision = ratings.decision ?? (r as any)?.decision ?? null;

      setReview((prev) => ({
        application_id: appId,
        score: r.score ?? prev.score ?? null,
        comments: r.comments ?? prev.comments ?? "",
        ratings: ratings,
        decision: decision,
        status: r.status ?? prev.status ?? "draft",
        id: r.id ?? prev.id,
        reviewer_id: r.reviewer_id ?? prev.reviewer_id,
        reviewer_name: reviewerName ?? prev.reviewer_name,
        submitted_at: r.submitted_at ?? prev.submitted_at,
        updated_at: r.updated_at ?? prev.updated_at,
        created_at: r.created_at ?? prev.created_at,
      }));

      setLoading(false);
    } catch (err) {
      console.error("Error in direct queries:", err);
      setError("Failed to load data");
      setLoading(false);
    }
  }

  // Stable reference to load function to prevent infinite loops
  const loadRef = useRef(load);
  loadRef.current = load;

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription for collaborative editing
  useEffect(() => {
    const channel = supabase
      .channel(`review:${appId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_reviews",
          filter: `application_id=eq.${appId}`,
        },
        () => {
          // Only reload if it's been more than 2 seconds since last save
          // This prevents double reloads when we save and then Realtime fires
          const now = Date.now();
          const lastSaveTime = (window as any).lastSaveTime || 0;
          if (now - lastSaveTime > 2000) {
            setTimeout(() => {
              loadRef.current();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appId]);

  // Save draft function
  const saveDraft = useCallback(
    async (next: {
      score?: number | null;
      comments?: string | null;
      ratings?: any;
      decision?: string | null;
    }) => {
      setSaving("saving");
      try {
        // Store decision in ratings JSON as a workaround
        const ratingsWithDecision = {
          ...(next.ratings ?? review?.ratings ?? {}),
          ...(next.decision ? { decision: next.decision } : {}),
        };

        const { error } = await supabase.rpc("app_upsert_review_v1", {
          p_application_id: appId,
          p_score: next.score ?? review?.score ?? null,
          p_comments: next.comments ?? review?.comments ?? null,
          p_ratings: ratingsWithDecision,
          p_status: null,
        });

        if (!error) {
          // Record save time to prevent double reload from Realtime
          (window as any).lastSaveTime = Date.now();
          // Refresh data to get updated reviewer_name and updated_at
          await loadRef.current();
          setSaving("saved");
        } else {
          setSaving("error");
        }
      } catch (error) {
        setSaving("error");
      }
    },
    [
      appId,
      review?.score,
      review?.comments,
      review?.ratings,
      (review as any)?.decision,
    ]
  );

  // Submit review function
  const submit = useCallback(
    async (next: {
      score?: number | null;
      comments?: string | null;
      ratings?: any;
      decision?: string | null;
    }) => {
      setSaving("saving");
      try {
        // Store decision in ratings JSON as a workaround
        const ratingsWithDecision = {
          ...(next.ratings ?? review?.ratings ?? {}),
          ...(next.decision ? { decision: next.decision } : {}),
        };

        const { error } = await supabase.rpc("app_upsert_review_v1", {
          p_application_id: appId,
          p_score: next.score ?? review?.score ?? null,
          p_comments: next.comments ?? review?.comments ?? null,
          p_ratings: ratingsWithDecision,
          p_status: "submitted",
        });

        if (!error) {
          // Record save time to prevent double reload from Realtime
          (window as any).lastSaveTime = Date.now();
          // Refresh data to get updated reviewer_name and updated_at
          await loadRef.current();
          setSaving("saved");
        } else {
          setSaving("error");
        }
      } catch (error) {
        setSaving("error");
      }
    },
    [
      appId,
      review?.score,
      review?.comments,
      review?.ratings,
      (review as any)?.decision,
    ]
  );

  // Helper functions for individual field updates
  const setScore = useCallback((score: number | null) => {
    setReview((r) => ({ ...r, score }));
  }, []);

  const setComments = useCallback((comments: string) => {
    setReview((r) => ({ ...r, comments }));
  }, []);

  const setRatingsJSON = useCallback((jsonText: string) => {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      setReview((r) => ({ ...r, ratings: parsed }));
    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  }, []);

  const setDecision = useCallback((decision: string | null) => {
    setReview((r) => ({
      ...r,
      decision,
      ratings: {
        ...r.ratings,
        ...(decision ? { decision } : {}),
      },
    }));
  }, []);

  const getRatingsJSON = useCallback(() => {
    return JSON.stringify(review?.ratings ?? {}, null, 2);
  }, [review?.ratings]);

  return {
    answers,
    review,
    applicationSchema,
    reviewFormConfig,
    program,
    loading,
    saving,
    error,
    saveDraft,
    submit,
    setScore,
    setComments,
    setRatingsJSON,
    setDecision,
    getRatingsJSON,
  };
}
