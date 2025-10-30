import { supabase } from "./supabase-browser";

export type ProfileSnapshot = {
  id?: string;
  full_name: string | null;
  given_name?: string | null;
  family_name?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  phone_number?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  personal_statement?: string | null;
  profile_files?: Array<{
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
  }> | null;
  resume_file?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
  } | null;
  parent_guardian_name?: string | null;
  parent_guardian_email?: string | null;
  parent_guardian_phone?: string | null;
  emergency_contact_is_parent?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_email?: string | null;
  emergency_contact_phone?: string | null;
  // Legacy nested address for backward compatibility
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  // Legacy files for backward compatibility
  files?: Array<{
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
  }> | null;
};

export function programUsesProfile(program: any): boolean {
  return (
    Boolean(program?.metadata?.application?.profile?.enabled) ||
    Boolean(program?.metadata?.form?.include_profile)
  );
}

export function getRequiredProfileSections(program: any): {
  personal: boolean;
  family: boolean;
  writing: boolean;
  experience: boolean;
} {
  // Check if profile is enabled at all
  const profileEnabled =
    program?.metadata?.application?.profile?.enabled !== false;
  if (!profileEnabled) {
    return {
      personal: false,
      family: false,
      writing: false,
      experience: false,
    };
  }

  const profileSections =
    program?.metadata?.application?.profile?.sections || {};
  return {
    personal: profileSections.personal === true, // Must be explicitly true
    family: profileSections.family === true, // Must be explicitly true
    writing: profileSections.writing === true, // Must be explicitly true
    experience: profileSections.experience === true, // Must be explicitly true
  };
}

export function validateProfileSections(
  profile: ProfileSnapshot | null,
  requiredSections: {
    personal: boolean;
    family: boolean;
    writing: boolean;
    experience: boolean;
  }
): { isValid: boolean; missingSections: string[] } {
  const missingSections: string[] = [];

  // If no profile is required, return valid
  const hasAnyRequiredSections = Object.values(requiredSections).some(Boolean);
  if (!hasAnyRequiredSections) {
    return { isValid: true, missingSections: [] };
  }

  // If profile is required but not found, return invalid
  if (!profile) {
    const requiredSectionNames: string[] = [];
    if (requiredSections.personal)
      requiredSectionNames.push("Personal Information");
    if (requiredSections.family)
      requiredSectionNames.push("Family/Emergency Contact");
    if (requiredSections.writing) requiredSectionNames.push("Writing & Essays");
    if (requiredSections.experience)
      requiredSectionNames.push("Experience & Portfolio");

    return {
      isValid: false,
      missingSections: [
        `Profile not found. Please complete: ${requiredSectionNames.join(
          ", "
        )}`,
      ],
    };
  }

  // Personal Information validation
  if (requiredSections.personal) {
    const personalFields = [
      { key: "full_name", label: "Full Name" },
      { key: "date_of_birth", label: "Date of Birth" },
      { key: "phone_number", label: "Phone Number" },
    ];

    const hasAddress =
      profile.address_line1 ||
      profile.address_city ||
      profile.address_state ||
      profile.address_postal_code ||
      profile.address_country;

    const missingPersonal = personalFields.filter(
      (field) => !profile[field.key as keyof ProfileSnapshot]
    );
    if (missingPersonal.length > 0) {
      missingSections.push(
        `Personal Information: ${missingPersonal
          .map((f) => f.label)
          .join(", ")}`
      );
    }

    if (!hasAddress) {
      missingSections.push("Personal Information: Address");
    }
  }

  // Family/Emergency Contact validation
  if (requiredSections.family) {
    const hasParentGuardian =
      profile.parent_guardian_name ||
      profile.parent_guardian_email ||
      profile.parent_guardian_phone;
    const hasEmergencyContact =
      profile.emergency_contact_name ||
      profile.emergency_contact_email ||
      profile.emergency_contact_phone;

    if (!hasParentGuardian && !hasEmergencyContact) {
      missingSections.push(
        "Family/Emergency Contact: At least one contact method required"
      );
    }
  }

  // Writing validation
  if (requiredSections.writing) {
    if (
      !profile.personal_statement ||
      profile.personal_statement.trim() === ""
    ) {
      missingSections.push("Writing & Essays: Personal Statement");
    }
  }

  // Experience/Portfolio validation
  if (requiredSections.experience) {
    if (!profile.resume_file) {
      missingSections.push("Experience & Portfolio: Resume");
    }
  }

  return {
    isValid: missingSections.length === 0,
    missingSections,
  };
}

export async function fetchProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("No authenticated user");
    return null;
  }

  const { data, error } = await supabase.rpc("get_profile_snapshot");
  if (error) {
    console.warn("get_profile_snapshot error", error);
    return null;
  }

  if (!data) return null;

  // Transform database structure to ProfileSnapshot format
  const transformed: ProfileSnapshot = {
    id: data.id,
    full_name: data.full_name,
    given_name: data.given_name,
    family_name: data.family_name,
    date_of_birth: data.date_of_birth,
    phone_number: data.phone_number,
    // Ensure email is always present: fall back to auth user email if missing in profile
    email: data.email ?? user.email ?? null,
    address_line1: data.address_line1,
    address_line2: data.address_line2,
    address_city: data.address_city,
    address_state: data.address_state,
    address_postal_code: data.address_postal_code,
    address_country: data.address_country,
    personal_statement: data.personal_statement,
    profile_files: data.profile_files,
    resume_file: data.resume_file,
    parent_guardian_name: data.parent_guardian_name,
    parent_guardian_email: data.parent_guardian_email,
    parent_guardian_phone: data.parent_guardian_phone,
    emergency_contact_is_parent: data.emergency_contact_is_parent,
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_email: data.emergency_contact_email,
    emergency_contact_phone: data.emergency_contact_phone,
    // Legacy nested address for backward compatibility
    address:
      data.address_line1 ||
      data.address_city ||
      data.address_state ||
      data.address_postal_code ||
      data.address_country
        ? {
            line1: data.address_line1,
            line2: data.address_line2,
            city: data.address_city,
            state: data.address_state,
            postal_code: data.address_postal_code,
            country: data.address_country,
          }
        : null,
    // Legacy files for backward compatibility
    files: data.profile_files,
  };

  return transformed;
}

export function mergeProfileIntoAnswers(
  currentAnswers: any,
  profile: ProfileSnapshot | null
) {
  if (!profile) return currentAnswers ?? {};

  const next = { ...(currentAnswers ?? {}) };
  next.profile = {
    ...profile,
    __source: "profile",
    __version: 1,
    __snapshot_at: new Date().toISOString(),
  };

  return next;
}
