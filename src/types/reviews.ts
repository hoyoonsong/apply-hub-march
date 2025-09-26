export type ReviewsListRow = {
  review_id: string;
  application_id: string;
  status: "draft" | "submitted" | "not_started";
  score: number | null;
  updated_at: string | null;
  submitted_at: string | null;
  comments: string | null;
  ratings: Record<string, any> | null;
  reviewer_id: string | null;
  reviewer_name: string; // <- show this in the table
  applicant_id: string;
  applicant_name: string | null;
  program_id: string;
  program_name: string;
  org_id: string;
  org_name: string;
};

export type ReviewRecord = {
  id?: string;
  application_id: string;
  reviewer_id?: string | null;
  reviewer_name?: string | null; // last editor's display name
  score?: number | null;
  comments?: string | null;
  ratings?: Record<string, unknown> | null;
  status?: "draft" | "submitted" | "not_started" | null;
  submitted_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type ReviewGetRow = {
  application_id: string;
  program_id: string;
  applicant_answers: Record<string, any> | null;
  review: {
    id?: string;
    application_id?: string;
    reviewer_id?: string | null;
    reviewer_name?: string | null; // <-- used in UI
    score?: number | null;
    comments?: string | null;
    ratings?: Record<string, any> | null;
    status?: "draft" | "submitted" | "not_started" | null;
    submitted_at?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  };
};
