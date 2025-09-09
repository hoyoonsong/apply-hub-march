"use client";
import { supabase } from "../lib/supabase-browser";

export type ApplicationSchema = any; // keep flexible; BE stores JSONB

export type AppRow = {
  id: string;
  program_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  answers: Record<string, any>;
  application_schema?: ApplicationSchema;
};

export async function getProgramPublic(programId: string) {
  if (!programId) throw new Error("programId required");
  const { data, error } = await supabase
    .from("programs_public")
    .select("id, application_schema")
    .eq("id", programId)
    .single();
  if (error) throw error;
  return data as { id: string; application_schema: ApplicationSchema | null };
}

export async function startOrGetApplication(programId: string) {
  if (!programId) throw new Error("programId required");
  const { data, error } = await supabase.rpc(
    "app_start_or_get_application_v1",
    {
      p_program_id: programId,
    }
  );
  if (error) throw error;
  return data as string; // application id (uuid)
}

export async function getApplication(appId: string) {
  if (!appId) throw new Error("applicationId required");
  const { data, error } = await supabase.rpc("app_get_application_v1", {
    p_application_id: appId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as AppRow;
}

// Deprecated - use saveApplication from lib/rpc.ts instead

export async function getBuilderSchema(programId: string) {
  const { data, error } = await supabase.rpc("app_builder_get_v1", {
    p_program_id: programId,
  });
  if (error) throw error;
  return data as any; // expected shape: { fields: [...] }
}

export async function setBuilderSchema(programId: string, schema: any) {
  const { data, error } = await supabase.rpc("app_builder_save_v1", {
    p_program_id: programId,
    p_schema: schema ?? {},
  });
  if (error) throw error;
  return data as any;
}

export async function saveBuilderSchema(
  programId: string,
  schema: ApplicationSchema
) {
  const { data, error } = await supabase.rpc("app_builder_save_v1", {
    p_program_id: programId,
    p_schema: schema ?? {},
  });
  if (error) throw error;
  return data as ApplicationSchema;
}
