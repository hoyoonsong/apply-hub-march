import { useState } from "react";
import { FilePreview } from "../attachments/FilePreview";
import AutoLinkText from "../AutoLinkText";

export default function ProfileCard({
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
}) {
  const addr = profile?.address || {};

  const [expandedSections, setExpandedSections] = useState({
    personal: true,
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
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
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
              <div className="bg-white rounded border p-2 space-y-1">
                <div className="text-xs font-medium text-gray-600">Name</div>
                <div className="text-sm text-gray-900 font-medium">
                  {profile?.full_name || (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </div>
              </div>

              {/* Birth Date */}
              <div className="bg-white rounded border p-2 space-y-1">
                <div className="text-xs font-medium text-gray-600">
                  Birth Date
                </div>
                <div className="text-sm text-gray-900">
                  {profile?.date_of_birth ? (
                    new Date(profile.date_of_birth).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )
                  ) : (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded border p-2 space-y-1">
                <div className="text-xs font-medium text-gray-600">Address</div>
                <div className="text-sm text-gray-900">
                  {addr?.line1 ||
                  addr?.city ||
                  addr?.state ||
                  addr?.postal_code ||
                  addr?.country ? (
                    <>
                      {[addr.line1, addr.line2].filter(Boolean).join(" ")}
                      <br />
                      {[addr.city, addr.state].filter(Boolean).join(", ")}{" "}
                      {addr.postal_code || ""}
                      {addr.country ? ` · ${addr.country}` : ""}
                    </>
                  ) : (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="bg-white rounded border p-2 space-y-1">
                <div className="text-xs font-medium text-gray-600">
                  Phone Number
                </div>
                <div className="text-sm text-gray-900">
                  {profile?.phone_number || (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="bg-white rounded border p-2 space-y-1">
                <div className="text-xs font-medium text-gray-600">Email</div>
                <div className="text-sm text-gray-900">
                  {profile?.email || (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </div>
              </div>
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
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
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
              <div className="bg-white rounded border p-3 space-y-2">
                <div className="text-xs font-medium text-gray-600">
                  Parent/Guardian Information
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500">Name</div>
                  <div className="text-sm text-gray-900">
                    {profile?.parent_guardian_name || (
                      <span className="text-gray-500 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500">Email</div>
                  <div className="text-sm text-gray-900">
                    {profile?.parent_guardian_email || (
                      <span className="text-gray-500 italic">Not provided</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500">Phone</div>
                  <div className="text-sm text-gray-900">
                    {profile?.parent_guardian_phone || (
                      <span className="text-gray-500 italic">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact Information */}
              <div className="bg-white rounded border p-3 space-y-2">
                <div className="text-xs font-medium text-gray-600">
                  Emergency Contact
                </div>
                {profile?.emergency_contact_is_parent ? (
                  <div className="text-sm text-gray-900">
                    Same as parent/guardian above
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500">
                        Name
                      </div>
                      <div className="text-sm text-gray-900">
                        {profile?.emergency_contact_name || (
                          <span className="text-gray-500 italic">
                            Not provided
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500">
                        Email
                      </div>
                      <div className="text-sm text-gray-900">
                        {profile?.emergency_contact_email || (
                          <span className="text-gray-500 italic">
                            Not provided
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500">
                        Phone
                      </div>
                      <div className="text-sm text-gray-900">
                        {profile?.emergency_contact_phone || (
                          <span className="text-gray-500 italic">
                            Not provided
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
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
                  <div className="text-sm text-gray-900 leading-relaxed">
                    <AutoLinkText text={profile.personal_statement} preserveWhitespace={true} />
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
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
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
              {profile?.resume_file ? (
                <div className="bg-white rounded border p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-600">
                    Resume
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <FilePreview fileInfo={profile.resume_file} />
                  </div>
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
              <div className="bg-white rounded border p-3">
                <div className="text-xs font-medium text-gray-600">
                  Portfolio and Additional Files
                </div>
                {profile?.profile_files && profile.profile_files.length > 0 ? (
                  <div className="space-y-4 mt-2">
                    {profile.profile_files.map((fi: any, i: number) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <FilePreview fileInfo={fi} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-2">
                    <div className="text-3xl mb-2">📁</div>
                    <div className="text-xs font-medium mb-1">
                      No Files Uploaded
                    </div>
                    <div className="text-xs">
                      Applicant has not uploaded any portfolio or additional
                      files
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
