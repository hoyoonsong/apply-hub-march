import { useState, useEffect } from "react";
import { ApplicationFileViewer } from "./attachments/ApplicationFileViewer";
import { SimpleFileUpload } from "./attachments/SimpleFileUpload";
import { Program } from "../lib/programs";
import { FilePreview } from "./attachments/FilePreview";
import { loadApplicationSchema } from "../lib/schemaLoader";
import WordLimitedTextarea from "./WordLimitedTextarea";

interface Field {
  id: string;
  type: "short_text" | "long_text" | "date" | "select" | "checkbox" | "file";
  label: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
  maxWords?: number;
}

interface ApplicationPreviewProps {
  fields?: Field[];
  program?: Program;
  isOpen: boolean;
  onClose: () => void;
  alwaysOpen?: boolean; // For super admin preview where it's always visible
}

export default function ApplicationPreview({
  fields: propFields,
  program,
  isOpen,
  onClose,
  alwaysOpen = false,
}: ApplicationPreviewProps) {
  // In-preview, avoid hitting storage for signed URLs. Use a lightweight mock preview.
  const MockFilePreview = ({ fileInfo }: { fileInfo: any }) => {
    const name = fileInfo?.fileName || "Example_Document.pdf";
    const sizeMb = fileInfo?.fileSize
      ? (fileInfo.fileSize / (1024 * 1024)).toFixed(2)
      : "0.25";
    return (
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{sizeMb} MB</div>
        </div>
        <div className="w-full h-48 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
          Preview placeholder (preview mode)
        </div>
      </div>
    );
  };
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<Field[]>(propFields || []);
  const [loading, setLoading] = useState(false);

  // Load fields from program if provided
  useEffect(() => {
    if (program && !propFields) {
      loadFieldsFromProgram();
    } else if (propFields) {
      setFields(propFields);
    }
  }, [program, propFields]);

  const loadFieldsFromProgram = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const schema = await loadApplicationSchema(program);
      setFields(schema.fields);
    } catch (e) {
      console.error("Failed to load fields:", e);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !alwaysOpen) return null;

  const setVal = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Check if program uses profile autofill
  const programUsesProfile = (program: Program) => {
    const appMeta = program?.metadata?.application || {};
    const formMeta = program?.metadata?.form || {};
    return !!(appMeta?.profile?.enabled || formMeta?.include_profile);
  };

  // Create a mock profile for preview
  const createMockProfile = () => ({
    full_name: "John Doe",
    date_of_birth: "1995-06-15",
    phone_number: "(555) 123-4567",
    address: {
      line1: "123 Main Street",
      line2: "Apt 4B",
      city: "San Francisco",
      state: "CA",
      postal_code: "94102",
      country: "United States",
    },
    parent_guardian: {
      name: "Jane Doe",
      email: "jane.doe@email.com",
      phone: "(555) 987-6543",
    },
    emergency_contact: {
      is_parent: false,
      name: "Bob Smith",
      email: "bob.smith@email.com",
      phone: "(555) 456-7890",
    },
    personal_statement:
      "I am passionate about making a positive impact in my community through innovative solutions and collaborative leadership. My experience in volunteer work and academic achievements have prepared me to contribute meaningfully to this program.",
    resume: {
      fileName: "John_Doe_Resume.pdf",
      fileSize: 245760,
      filePath: "resumes/john-doe-resume.pdf",
      contentType: "application/pdf",
      uploadedAt: "2024-01-15T10:30:00Z",
      uploadedBy: "john.doe@email.com",
    },
    files: [
      {
        fileName: "Portfolio_Project.pdf",
        fileSize: 1024000,
        filePath: "portfolios/john-doe-portfolio.pdf",
        contentType: "application/pdf",
        uploadedAt: "2024-01-20T14:15:00Z",
        uploadedBy: "john.doe@email.com",
      },
      {
        fileName: "Recommendation_Letter.pdf",
        fileSize: 512000,
        filePath: "recommendations/john-doe-recommendation.pdf",
        contentType: "application/pdf",
        uploadedAt: "2024-01-18T09:45:00Z",
        uploadedBy: "john.doe@email.com",
      },
    ],
  });

  // ProfileCardPreview component with all sections collapsed by default
  const ProfileCardPreview = ({
    profile,
    sectionSettings,
  }: {
    profile: any;
    sectionSettings?: {
      personal?: boolean;
      family?: boolean;
      writing?: boolean;
      experience?: boolean;
    };
  }) => {
    const addr = profile?.address || {};
    const files: any[] = Array.isArray(profile?.files) ? profile.files : [];

    const [expandedSections, setExpandedSections] = useState({
      personal: false,
      family: false,
      writing: false,
      experience: false,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    };

    // Default to showing all sections if no settings provided
    const shouldShowPersonal = sectionSettings?.personal !== false;
    const shouldShowFamily = sectionSettings?.family !== false;
    const shouldShowWriting = sectionSettings?.writing !== false;
    const shouldShowExperience = sectionSettings?.experience !== false;

    return (
      <div className="space-y-0">
        {/* Personal Info Section */}
        {shouldShowPersonal && (
          <div className="space-y-0">
            <button
              onClick={() => toggleSection("personal")}
              className="w-full text-left flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Personal Information
                </span>
              </div>
              <div className="text-gray-500">
                {expandedSections.personal ? "▼" : "▶"}
              </div>
            </button>

            {expandedSections.personal && (
              <div className="bg-gray-50 rounded-lg rounded-t-none p-3 space-y-2">
                {/* Name */}
                {profile?.full_name && (
                  <div className="bg-white rounded border p-2 space-y-1">
                    <div className="text-xs font-medium text-gray-600">
                      Name
                    </div>
                    <div className="text-sm text-gray-900 font-medium">
                      {profile.full_name}
                    </div>
                  </div>
                )}

                {/* Birth Date */}
                {profile?.date_of_birth && (
                  <div className="bg-white rounded border p-2 space-y-1">
                    <div className="text-xs font-medium text-gray-600">
                      Birth Date
                    </div>
                    <div className="text-sm text-gray-900">
                      {new Date(profile.date_of_birth).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {(addr?.line1 ||
                  addr?.city ||
                  addr?.state ||
                  addr?.postal_code ||
                  addr?.country) && (
                  <div className="bg-white rounded border p-2 space-y-1">
                    <div className="text-xs font-medium text-gray-600">
                      Address
                    </div>
                    <div className="text-sm text-gray-900">
                      {[addr.line1, addr.line2].filter(Boolean).join(" ")}
                      <br />
                      {[addr.city, addr.state].filter(Boolean).join(", ")}{" "}
                      {addr.postal_code || ""}
                      {addr.country ? ` · ${addr.country}` : ""}
                    </div>
                  </div>
                )}

                {/* Phone Number */}
                {profile?.phone_number && (
                  <div className="bg-white rounded border p-2 space-y-1">
                    <div className="text-xs font-medium text-gray-600">
                      Phone Number
                    </div>
                    <div className="text-sm text-gray-900">
                      {profile.phone_number}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Family/Emergency Contact Section */}
        {shouldShowFamily && (
          <div className="space-y-0">
            <button
              onClick={() => toggleSection("family")}
              className="w-full text-left flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Family & Emergency Contact
                </span>
              </div>
              <div className="text-gray-500">
                {expandedSections.family ? "▼" : "▶"}
              </div>
            </button>

            {expandedSections.family && (
              <div className="bg-gray-50 rounded-lg rounded-t-none p-3 space-y-2">
                {/* Parent/Guardian Information */}
                {(profile?.parent_guardian?.name ||
                  profile?.parent_guardian?.email ||
                  profile?.parent_guardian?.phone) && (
                  <div className="bg-white rounded border p-3 space-y-2">
                    <div className="text-xs font-medium text-gray-600">
                      Parent/Guardian Information
                    </div>
                    {profile?.parent_guardian?.name && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">
                          Name
                        </div>
                        <div className="text-sm text-gray-900">
                          {profile.parent_guardian.name}
                        </div>
                      </div>
                    )}
                    {profile?.parent_guardian?.email && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">
                          Email
                        </div>
                        <div className="text-sm text-gray-900">
                          {profile.parent_guardian.email}
                        </div>
                      </div>
                    )}
                    {profile?.parent_guardian?.phone && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">
                          Phone
                        </div>
                        <div className="text-sm text-gray-900">
                          {profile.parent_guardian.phone}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency Contact Information */}
                {profile?.emergency_contact && (
                  <div className="bg-white rounded border p-3 space-y-2">
                    <div className="text-xs font-medium text-gray-600">
                      Emergency Contact
                    </div>
                    {profile.emergency_contact.is_parent ? (
                      <div className="text-sm text-gray-900">
                        Same as parent/guardian above
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profile.emergency_contact.name && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500">
                              Name
                            </div>
                            <div className="text-sm text-gray-900">
                              {profile.emergency_contact.name}
                            </div>
                          </div>
                        )}
                        {profile.emergency_contact.email && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500">
                              Email
                            </div>
                            <div className="text-sm text-gray-900">
                              {profile.emergency_contact.email}
                            </div>
                          </div>
                        )}
                        {profile.emergency_contact.phone && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500">
                              Phone
                            </div>
                            <div className="text-sm text-gray-900">
                              {profile.emergency_contact.phone}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Show placeholder if no family/emergency contact info */}
                {!profile?.parent_guardian?.name &&
                  !profile?.parent_guardian?.email &&
                  !profile?.parent_guardian?.phone &&
                  !profile?.emergency_contact && (
                    <div className="bg-white rounded border p-3 text-center text-gray-500">
                      <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
                      <div className="text-xs font-medium mb-1">
                        No Contact Information
                      </div>
                      <div className="text-xs">
                        Family and emergency contact information not provided
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Writing Section */}
        {shouldShowWriting && (
          <div className="space-y-0">
            <button
              onClick={() => toggleSection("writing")}
              className="w-full text-left flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Writing & Essays
                </span>
              </div>
              <div className="text-gray-500">
                {expandedSections.writing ? "▼" : "▶"}
              </div>
            </button>

            {expandedSections.writing && (
              <div className="bg-gray-50 rounded-lg rounded-t-none p-3">
                {profile?.personal_statement ? (
                  <div className="bg-white rounded border p-3 space-y-2">
                    <div className="text-xs font-medium text-gray-600">
                      Personal Statement
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {profile.personal_statement}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded border p-3 text-center text-gray-500">
                    <div className="text-3xl mb-2">✍️</div>
                    <div className="text-xs font-medium mb-1">
                      No Personal Statement
                    </div>
                    <div className="text-xs">
                      Applicant has not provided a personal statement
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Experience/Portfolio Section */}
        {shouldShowExperience && (
          <div className="space-y-0">
            <button
              onClick={() => toggleSection("experience")}
              className="w-full text-left flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Experience & Portfolio
                </span>
              </div>
              <div className="text-gray-500">
                {expandedSections.experience ? "▼" : "▶"}
              </div>
            </button>

            {expandedSections.experience && (
              <div className="bg-gray-50 rounded-lg rounded-t-none p-3 space-y-2">
                {/* Resume */}
                {profile?.resume ? (
                  <div className="bg-white rounded border p-3 space-y-2">
                    <div className="text-xs font-medium text-gray-600">
                      Resume
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg">📄</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {profile.resume.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {profile.resume.fileSize
                            ? (profile.resume.fileSize / (1024 * 1024)).toFixed(
                                2
                              )
                            : "0"}{" "}
                          MB
                        </div>
                      </div>
                    </div>
                    {/* Use mock preview in preview modal to avoid storage lookups */}
                    <MockFilePreview fileInfo={profile.resume} />
                  </div>
                ) : (
                  <div className="bg-white rounded border p-3">
                    <div className="text-center text-gray-500">
                      <div className="text-3xl mb-2">📄</div>
                      <div className="text-xs font-medium mb-1">
                        No Resume Uploaded
                      </div>
                      <div className="text-xs">Resume not provided</div>
                    </div>
                  </div>
                )}

                {/* Portfolio and additional files */}
                {files.length > 0 ? (
                  <div className="bg-white rounded border p-3">
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-gray-600">
                        Portfolio and Additional Files
                      </div>
                      <div className="space-y-3">
                        {files.map((fi, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 rounded border p-2"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-lg">📎</div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {fi.fileName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {fi.fileSize
                                    ? (fi.fileSize / (1024 * 1024)).toFixed(2)
                                    : "0"}{" "}
                                  MB
                                </div>
                              </div>
                            </div>
                            {/* Use mock preview in preview modal to avoid storage lookups */}
                            <MockFilePreview fileInfo={fi} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded border p-3">
                    <div className="text-center text-gray-500">
                      <div className="text-3xl mb-2">📁</div>
                      <div className="text-xs font-medium mb-1">
                        No Files Uploaded
                      </div>
                      <div className="text-xs">
                        Applicant has not uploaded any portfolio or additional
                        files
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderField = (field: Field, _index: number) => {
    const val = answers[field.id];

    switch (field.type) {
      case "short_text":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <input
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            />
          </div>
        );
      case "long_text":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <WordLimitedTextarea
              label={field.label}
              value={val ?? ""}
              onChange={(value) => setVal(field.id, value)}
              maxWords={field.maxWords ?? 100}
              rows={4}
              required={field.required}
            />
          </div>
        );
      case "date":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <input
              className="rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            />
          </div>
        );
      case "select":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case "checkbox":
        return (
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                checked={!!val}
                onChange={(e) => setVal(field.id, e.target.checked)}
              />
              <label className="text-sm font-medium text-gray-700">
                {field.label}
                {field.required && " *"}
              </label>
            </div>
          </div>
        );
      case "file":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <SimpleFileUpload
              applicationId="preview"
              fieldId={field.id}
              value={val || ""}
              onChange={(value) => setVal(field.id, value)}
              disabled={true}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (alwaysOpen) {
    return (
      <div className="space-y-6">
        {/* Profile Autofill Section */}
        {program && programUsesProfile(program) && (
          <div className="mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Applicant Profile (Autofilled)
                </h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                This information was automatically filled from the applicant's
                profile.
              </p>
              <ProfileCardPreview
                profile={createMockProfile()}
                sectionSettings={
                  program?.metadata?.application?.profile?.sections
                }
              />
            </div>
          </div>
        )}

        {/* Organization Application Questions Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-gray-900">
              Organization Application Questions
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Answer the following questions specific to this program.
          </p>

          <div className="space-y-6">
            {loading ? (
              <div className="bg-white border rounded-lg p-6">
                <p className="text-gray-500 text-center py-8">
                  Loading application fields...
                </p>
              </div>
            ) : fields.length === 0 ? (
              <div className="bg-white border rounded-lg p-6">
                <p className="text-gray-500 text-center py-8">
                  No fields added yet. Add some fields to see the preview.
                </p>
              </div>
            ) : (
              fields.map((field, index) => (
                <div key={field.id || index}>{renderField(field, index)}</div>
              ))
            )}
          </div>
        </div>

        {/* File Attachments Section (preview-safe) */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">File Attachments</h3>
          {(() => {
            // Build a preview-safe list of file-like answers without storage calls
            const fileEntries = Object.entries(answers || {})
              .map(([k, v]) => {
                try {
                  if (typeof v === "string") {
                    const parsed = JSON.parse(v);
                    if (parsed && parsed.fileName) return { k, fi: parsed };
                  } else if (v && typeof v === "object" && (v as any).fileName) {
                    return { k, fi: v as any };
                  }
                } catch {}
                return null;
              })
              .filter(Boolean) as Array<{ k: string; fi: any }>;

            if (fileEntries.length === 0) {
              return (
                <div className="text-sm text-gray-500">No file attachments</div>
              );
            }

            return (
              <div className="space-y-3">
                {fileEntries.map(({ k, fi }) => (
                  <div key={k} className="space-y-1">
                    <div className="text-xs text-gray-500">Field: {k}</div>
                    <MockFilePreview fileInfo={fi} />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                // In a real preview, this would submit the form
                alert(
                  "This is just a preview - form submission is not functional"
                );
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Submit Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Application Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Profile Autofill Section */}
            {program && programUsesProfile(program) && (
              <div className="mb-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      Applicant Profile (Autofilled)
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    This information was automatically filled from the
                    applicant's profile.
                  </p>
                  <ProfileCardPreview
                    profile={createMockProfile()}
                    sectionSettings={
                      program?.metadata?.application?.profile?.sections
                    }
                  />
                </div>
              </div>
            )}

            {/* Organization Application Questions Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Organization Application Questions
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Answer the following questions specific to this program.
              </p>

              <div className="space-y-6">
                {loading ? (
                  <div className="bg-white border rounded-lg p-6">
                    <p className="text-gray-500 text-center py-8">
                      Loading application fields...
                    </p>
                  </div>
                ) : fields.length === 0 ? (
                  <div className="bg-white border rounded-lg p-6">
                    <p className="text-gray-500 text-center py-8">
                      No fields added yet. Add some fields to see the preview.
                    </p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div key={field.id || index}>
                      {renderField(field, index)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  // In a real preview, this would submit the form
                  alert(
                    "This is just a preview - form submission is not functional"
                  );
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
