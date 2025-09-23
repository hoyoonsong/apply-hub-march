export type FieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "DATE"
  | "SELECT"
  | "CHECKBOX"
  | "FILE";

export type AppField = {
  key: string; // unique stable key
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number; // for LONG_TEXT
  maxWords?: number; // for LONG_TEXT
  options?: string[]; // for SELECT
};

export type ApplicationSchema = {
  fields: AppField[];
};

// Answers JSON shape: { [field.key]: any }
export type Answers = Record<string, any>;

export type ApplicationRow = {
  id: string;
  program_id: string;
  user_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  answers: Answers;
  created_at: string;
  updated_at: string;
};

// Legacy types for backward compatibility
export type AppItem =
  | {
      type: "short_text";
      label: string;
      key?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      type: "long_text";
      label: string;
      key?: string;
      required?: boolean;
      maxLength?: number;
      maxWords?: number;
    }
  | { type: "checkbox"; label: string; key?: string; required?: boolean }
  | { type: "date"; label: string; key?: string; required?: boolean }
  | {
      type: "select";
      label: string;
      key?: string;
      required?: boolean;
      options: string[];
    }
  | { type: "file"; label: string; key?: string; required?: boolean };

export type ProgramApplicationSchema = {
  include_hub_common?: boolean;
  include_coalition_common?: boolean;
  items?: AppItem[];
};
