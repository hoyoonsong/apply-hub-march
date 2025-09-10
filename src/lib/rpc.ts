// lib/rpc.ts
import { createClient } from "./supabase-browser";

const sb = createClient();

export async function getProgramSchema(programId: string) {
  const { data, error } = await sb
    .from("programs_public")
    .select("id, application_schema, close_at")
    .eq("id", programId)
    .single();
  if (error) throw error;
  return data;
}

export async function startOrGetApplication(programId: string) {
  const { data, error } = await sb.rpc("app_start_or_get_application_v1", {
    p_program_id: programId,
  });
  if (error) throw error;
  return data; // applications row
}

export async function getApplication(appId: string) {
  const { data, error } = await sb.rpc("app_get_application_v1", {
    p_application_id: appId,
  });
  if (error) throw error;
  return data; // applications row
}

export async function saveApplication(appId: string, answers: any) {
  const { data, error } = await sb.rpc("app_save_application_v1", {
    p_application_id: appId,
    p_answers: answers ?? {},
  });
  if (error) throw error;
  return data;
}

export async function submitApplication(appId: string, answers: any) {
  const { data, error } = await sb.rpc("app_submit_application_v1", {
    p_application_id: appId,
    p_answers: answers ?? {},
  });
  if (error) throw error;
  return data;
}
