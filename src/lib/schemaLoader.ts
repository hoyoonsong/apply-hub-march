import { supabase } from "./supabase";
import { getBuilderSchema } from "../data/api";

export interface ProgramWithMetadata {
  id: string;
  metadata?: {
    application?: {
      schema?: any;
      profile?: any;
    };
    application_schema?: any;
    pending_schema?: any;
    review_status?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Centralized function to load application schema from any program object
 * This ensures consistent schema loading across all components
 */
export async function loadApplicationSchema(
  program: ProgramWithMetadata
): Promise<{ fields: any[] }> {
  if (!program) {
    console.warn("🔍 SchemaLoader - No program provided");
    return { fields: [] };
  }

  console.log("🔍 SchemaLoader - Loading schema for program:", program.id);

  const meta = program.metadata || {};
  const appMeta = meta.application || {};

  console.log("🔍 SchemaLoader - Review status:", meta.review_status);
  console.log("🔍 SchemaLoader - App meta schema:", appMeta.schema);

  // Check multiple possible locations for the schema in order of preference
  let schema = null;

  // 1. Check for pending changes first (for super admin review)
  const hasPendingChanges =
    meta.review_status === "pending_changes" ||
    meta.review_status === "submitted";
  const pendingSchema = meta.pending_schema;

  if (hasPendingChanges && pendingSchema) {
    console.log("🔍 SchemaLoader - Using pending schema:", pendingSchema);
    return { fields: pendingSchema.fields || [] };
  }

  // 1b. Check for changes requested - show working schema (not live schema)
  const hasChangesRequested = meta.review_status === "changes_requested";
  if (hasChangesRequested && appMeta.schema) {
    console.log(
      "🔍 SchemaLoader - Using working schema for changes_requested:",
      appMeta.schema
    );
    return { fields: appMeta.schema.fields || [] };
  }

  // 2. Check metadata.application.schema (most reliable for unpublished programs)
  if (appMeta.schema) {
    schema = appMeta.schema;
    console.log("🔍 SchemaLoader - Using appMeta.schema:", schema);
  }
  // 2b. Check metadata.application.builder (for coalition programs)
  else if (appMeta.builder) {
    schema = { fields: appMeta.builder };
    console.log("🔍 SchemaLoader - Using appMeta.builder:", schema);
  }
  // 3. Check metadata.application_schema
  else if (meta.application_schema) {
    schema = meta.application_schema;
    console.log("🔍 SchemaLoader - Using metadata.application_schema:", schema);
  }
  // 4. Try programs_public table
  else {
    try {
      const { data: schemaData, error: schemaError } = await supabase
        .from("programs_public")
        .select("application_schema")
        .eq("id", program.id)
        .single();

      console.log("🔍 SchemaLoader - programs_public query result:", {
        schemaData,
        schemaError,
      });

      if (!schemaError && schemaData && schemaData.application_schema) {
        schema = schemaData.application_schema;
        console.log("🔍 SchemaLoader - Using programs_public schema:", schema);
      } else {
        // 5. Last resort - try RPC call
        console.log("🔍 SchemaLoader - Trying RPC call as last resort");
        try {
          schema = await getBuilderSchema(program.id);
          console.log("🔍 SchemaLoader - RPC call result:", schema);
        } catch (rpcError) {
          console.error("🔍 SchemaLoader - RPC call failed:", rpcError);
          schema = { fields: [] }; // Default empty schema
        }
      }
    } catch (e) {
      console.error("🔍 SchemaLoader - Error loading from programs_public:", e);
      schema = { fields: [] };
    }
  }

  const result = { fields: schema?.fields || [] };
  console.log("🔍 SchemaLoader - Final result:", result);
  return result;
}

/**
 * Load schema for a program by ID (for cases where we only have the ID)
 */
export async function loadApplicationSchemaById(
  programId: string
): Promise<{ fields: any[] }> {
  if (!programId) {
    console.warn("🔍 SchemaLoader - No programId provided");
    return { fields: [] };
  }

  try {
    // First try to get the full program data from programs table
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id, name, metadata")
      .eq("id", programId)
      .single();

    if (!programError && programData) {
      console.log(
        "🔍 SchemaLoader - Found program in programs table:",
        programData.id
      );
      return await loadApplicationSchema(programData);
    } else {
      console.log(
        "🔍 SchemaLoader - Program not found in programs table, trying programs_public"
      );

      // Try programs_public table as fallback
      const { data: publicData, error: publicError } = await supabase
        .from("programs_public")
        .select("id, name, application_schema")
        .eq("id", programId)
        .single();

      if (!publicError && publicData) {
        console.log(
          "🔍 SchemaLoader - Found program in programs_public table:",
          publicData.id
        );
        if (publicData.application_schema) {
          return { fields: publicData.application_schema.fields || [] };
        }
      }

      // Final fallback to RPC call
      console.log(
        "🔍 SchemaLoader - Fallback to RPC call for programId:",
        programId
      );
      try {
        const schema = await getBuilderSchema(programId);
        return { fields: schema?.fields || [] };
      } catch (rpcError) {
        console.error("🔍 SchemaLoader - RPC call failed:", rpcError);
        return { fields: [] };
      }
    }
  } catch (e) {
    console.error("🔍 SchemaLoader - Error loading program by ID:", e);
    return { fields: [] };
  }
}
