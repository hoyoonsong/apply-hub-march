import { supabase } from "../lib/supabase";

export type FormSubmissionStatus = "pending" | "reviewed" | "approved" | "rejected";

export interface FormSubmission {
  id: string;
  form_type: string;
  form_data: Record<string, any>;
  status: FormSubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface OrganizationSignupData {
  name: string;
  description: string | null;
}

/**
 * Submit a form submission
 * Uses RPC function to bypass RLS, allowing anyone to submit
 */
export async function submitForm(
  formType: string,
  formData: Record<string, any>,
  userId?: string | null
): Promise<FormSubmission> {
  const { data, error } = await supabase.rpc("super_submit_form_v1", {
    p_form_type: formType,
    p_form_data: formData,
    p_user_id: userId || null,
  });

  if (error) {
    throw new Error(`Failed to submit form: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Failed to submit form: No data returned");
  }

  return data[0];
}

/**
 * Get all form submissions (superadmin only)
 * Uses RPC function to bypass RLS, matching pattern from other superadmin pages
 */
export async function listFormSubmissions(
  formType?: string,
  status?: FormSubmissionStatus
): Promise<FormSubmission[]> {
  const { data, error } = await supabase.rpc("super_list_forms_v1", {
    p_form_type: formType || null,
    p_status: status || null,
  });

  if (error) {
    throw new Error(`Failed to fetch form submissions: ${error.message}`);
  }

  return data || [];
}

/**
 * Update form submission status (superadmin only)
 * Uses RPC function to bypass RLS, matching pattern from other superadmin pages
 */
export async function updateFormSubmission(
  id: string,
  updates: {
    status?: FormSubmissionStatus;
    notes?: string | null;
  }
): Promise<FormSubmission> {
  const { data, error } = await supabase.rpc("super_update_form_v1", {
    p_id: id,
    p_status: updates.status || null,
    p_notes: updates.notes || null,
  });

  if (error) {
    throw new Error(`Failed to update form submission: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Failed to update form submission: No data returned");
  }

  return data[0];
}

/**
 * Get form submission by ID
 */
export async function getFormSubmission(
  id: string
): Promise<FormSubmission | null> {
  const { data, error } = await supabase
    .from("superadmin_forms")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch form submission: ${error.message}`);
  }

  return data;
}

