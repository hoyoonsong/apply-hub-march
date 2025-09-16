import React, { useState } from "react";
import { FilePreview } from "../attachments/FilePreview";

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
  const files: any[] = Array.isArray(profile?.files) ? profile.files : [];

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
                  <div className="text-xs font-medium text-gray-600">Name</div>
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
                          ? (profile.resume.fileSize / (1024 * 1024)).toFixed(2)
                          : "0"}{" "}
                        MB
                      </div>
                    </div>
                  </div>
                  <FilePreview fileInfo={profile.resume} />
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
                        <div key={i} className="bg-gray-50 rounded border p-2">
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
                          <FilePreview fileInfo={fi} />
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
}
