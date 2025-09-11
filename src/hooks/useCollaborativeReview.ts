import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ReviewGetRow } from "../types/reviews";

type ReviewRow = {
  id?: string;
  application_id: string;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  score?: number | null;
  comments?: string | null;
  ratings?: Record<string, unknown> | null;
  status?: string | null; // 'draft' | 'submitted'
  submitted_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type LoaderRow = ReviewGetRow;

/**
 * useCollaborativeReview
 * - RPC: review_get_v1(p_application_id uuid)  -> loads applicant answers + shared review
 * - RPC: upsert_review_v1(...)                -> autosave draft OR submit review
 * - Realtime: postgres_changes on application_reviews filtered by application_id
 */
export function useCollaborativeReview(appId: string) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [applicationSchema, setApplicationSchema] = useState<any>({});
  const [review, setReview] = useState<ReviewRow>({
    application_id: appId,
    score: null,
    comments: "",
    ratings: {},
    status: "draft",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  // ---------- LOAD (RPC: review_get_v1) ----------
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
      console.log("Review data:", row?.review);
      console.log("Reviewer name from RPC:", row?.review?.reviewer_name);
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
              .from("programs_public")
              .select("application_schema")
              .eq("id", programId)
              .single();

            if (programError) {
              console.error("Error fetching program schema:", programError);
            } else {
              schema = programData?.application_schema ?? {};
              console.log("Fetched schema from program:", schema);
            }
          }
        } catch (err) {
          console.error("Error fetching schema from program:", err);
        }
      }

      setApplicationSchema(schema);
      const r = (row?.review as any) ?? {};

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

      setReview((prev) => ({
        application_id: appId,
        score: r.score ?? prev.score ?? null,
        comments: r.comments ?? prev.comments ?? "",
        ratings: r.ratings ?? prev.ratings ?? {},
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

  // Stable reference to load function to prevent infinite loops
  const loadRef = useRef(load);
  loadRef.current = load;

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
        setError(appError.message);
        setLoading(false);
        return;
      }

      // Load review data directly
      const { data: reviewData, error: reviewError } = await supabase
        .from("application_reviews")
        .select("*")
        .eq("application_id", appId)
        .maybeSingle();

      if (reviewError) {
        console.error("Error loading review:", reviewError);
        setError(reviewError.message);
        setLoading(false);
        return;
      }

      // Load schema from program metadata
      let schema = {};
      if (appData?.program_id) {
        try {
          const { data: programData, error: programError } = await supabase
            .from("programs_public")
            .select("application_schema")
            .eq("id", appData.program_id)
            .single();

          if (programError) {
            console.error(
              "Error fetching program schema (fallback):",
              programError
            );
          } else {
            schema = programData?.application_schema ?? {};
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

      setReview((prev) => ({
        application_id: appId,
        score: r.score ?? prev.score ?? null,
        comments: r.comments ?? prev.comments ?? "",
        ratings: r.ratings ?? prev.ratings ?? {},
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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Try the new RPC first
        const { data, error } = await supabase.rpc("review_get_v1", {
          p_application_id: appId,
        });

        if (cancelled) return;

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
                .from("programs_public")
                .select("application_schema")
                .eq("id", programId)
                .single();

              if (!programError && programData) {
                schema = programData.application_schema ?? {};
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
        setReview((prev) => ({
          application_id: appId,
          score: r.score ?? prev.score ?? null,
          comments: r.comments ?? prev.comments ?? "",
          ratings: r.ratings ?? prev.ratings ?? {},
          status: r.status ?? prev.status ?? "draft",
          id: r.id ?? prev.id,
          reviewer_id: r.reviewer_id ?? prev.reviewer_id,
          submitted_at: r.submitted_at ?? prev.submitted_at,
          updated_at: r.updated_at ?? prev.updated_at,
          created_at: r.created_at ?? prev.created_at,
        }));
        setLoading(false);
      } catch (err) {
        console.error("Error in review_get_v1:", err);
        await loadWithDirectQueries();
      }

      async function loadWithDirectQueries() {
        if (cancelled) return;

        try {
          // Load application data directly (just answers, not schema)
          const { data: appData, error: appError } = await supabase
            .from("applications")
            .select("id, answers, program_id")
            .eq("id", appId)
            .single();

          if (appError) {
            console.error("Error loading application:", appError);
            setError(appError.message);
            setLoading(false);
            return;
          }

          // Load review data directly
          const { data: reviewData, error: reviewError } = await supabase
            .from("application_reviews")
            .select("*")
            .eq("application_id", appId)
            .maybeSingle();

          if (reviewError) {
            console.error("Error loading review:", reviewError);
            setError(reviewError.message);
            setLoading(false);
            return;
          }

          if (cancelled) return;

          // Load schema from program metadata
          let schema = {};
          if (appData?.program_id) {
            try {
              const { data: programData, error: programError } = await supabase
                .from("programs_public")
                .select("application_schema")
                .eq("id", appData.program_id)
                .single();

              if (!programError && programData) {
                schema = programData.application_schema ?? {};
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
          setReview((prev) => ({
            application_id: appId,
            score: r.score ?? prev.score ?? null,
            comments: r.comments ?? prev.comments ?? "",
            ratings: r.ratings ?? prev.ratings ?? {},
            status: r.status ?? prev.status ?? "draft",
            id: r.id ?? prev.id,
            reviewer_id: r.reviewer_id ?? prev.reviewer_id,
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
    })();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  // ---------- REALTIME (collaboration) ----------
  useEffect(() => {
    const channel = supabase
      .channel(`reviews:${appId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_reviews",
          filter: `application_id=eq.${appId}`,
        },
        (payload) => {
          // Debounce realtime updates to prevent excessive API calls
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            loadRef.current();
          }, 500); // 500ms debounce
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [appId]);

  // ---------- Field setters ----------
  const setScore = useCallback((v: number | null) => {
    setReview((r) => ({ ...r, score: v }));
    setHasUnsavedChanges(true);
  }, []);
  const setComments = useCallback((v: string) => {
    setReview((r) => ({ ...r, comments: v }));
    setHasUnsavedChanges(true);
  }, []);
  const setRatingsJSON = useCallback((jsonText: string) => {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      setReview((r) => ({ ...r, ratings: parsed }));
      setHasUnsavedChanges(true);
      setError(null);
    } catch {
      setError("Ratings must be valid JSON.");
    }
  }, []);

  // ---------- SAVE DRAFT (RPC: upsert_review_v1 with p_status=null) ----------
  const saveDraft = useCallback(async () => {
    // Don't save if there's no meaningful content
    const hasContent =
      (review.score !== null && review.score !== undefined) ||
      (review.comments && review.comments.trim() !== "") ||
      (review.ratings && Object.keys(review.ratings).length > 0);

    if (!hasContent) {
      console.log("Skipping save - no content to save");
      return;
    }

    setSaving("saving");
    console.log("Saving draft with data:", {
      p_application_id: appId,
      p_score: review.score ?? null,
      p_comments: review.comments ?? null,
      p_ratings: (review.ratings as any) ?? {},
      p_status: null,
    });

    const { error, data } = await supabase.rpc("upsert_review_v1", {
      p_application_id: appId,
      p_score: review.score ?? null,
      p_comments: review.comments ?? null,
      p_ratings: (review.ratings as any) ?? {},
      p_status: null, // keep current status -> draft autosave
    });

    if (error) {
      console.error("Save draft error:", error);
      setSaving("error");
      setError(error.message);
      return;
    }

    console.log("Save draft success:", data);
    setSaving("saved");
    // Refresh data to get updated reviewer_name and updated_at
    await loadRef.current();
  }, [appId, review.score, review.comments, review.ratings]);

  // ---------- SUBMIT (RPC: upsert_review_v1 with p_status='submitted') ----------
  const submit = useCallback(async () => {
    setSaving("saving");
    console.log("Submitting review with data:", {
      p_application_id: appId,
      p_score: review.score ?? null,
      p_comments: review.comments ?? null,
      p_ratings: (review.ratings as any) ?? {},
      p_status: "submitted",
    });

    const { error, data } = await supabase.rpc("upsert_review_v1", {
      p_application_id: appId,
      p_score: review.score ?? null,
      p_comments: review.comments ?? null,
      p_ratings: (review.ratings as any) ?? {},
      p_status: "submitted",
    });

    if (error) {
      console.error("Submit error:", error);
      setSaving("error");
      setError(error.message);
      return;
    }

    console.log("Submit success:", data);
    setSaving("saved");
    // Refresh data to get updated reviewer_name and updated_at
    await loadRef.current();
  }, [appId, review.score, review.comments, review.ratings]);

  // ---------- Debounced autosave on local edits ----------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // DISABLED AUTOSAVE FOR NOW - too aggressive
  // useEffect(() => {
  //   if (loading) return;
  //   if (debounceRef.current) clearTimeout(debounceRef.current);

  //   // Only autosave if there are actual changes and not submitted
  //   if (review.status !== "submitted" && hasUnsavedChanges) {
  //     debounceRef.current = setTimeout(() => {
  //       saveDraft();
  //       setHasUnsavedChanges(false);
  //     }, 2000); // Increased delay to 2 seconds
  //   }

  //   return () => {
  //     if (debounceRef.current) clearTimeout(debounceRef.current);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [review.score, review.comments, review.ratings, hasUnsavedChanges]);

  return {
    loading,
    saving,
    error,
    answers,
    applicationSchema,
    review,
    setScore,
    setComments,
    setRatingsJSON,
    saveDraft,
    submit,
  };
}

export default useCollaborativeReview;
