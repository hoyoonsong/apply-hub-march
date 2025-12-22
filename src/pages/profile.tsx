"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import ProfileFileUpload from "../components/profile/ProfileFileUpload";
import ResumeUpload from "../components/profile/ResumeUpload";

const SECTIONS = [
  { id: "personal", title: "Personal Info", icon: "👤" },
  { id: "family", title: "Family/Emergency Contact", icon: "👨‍👩‍👧‍👦" },
  { id: "writing", title: "Writing", icon: "✍️" },
  { id: "experience", title: "Experience/Portfolio", icon: "💼" },
];

export default function ProfilePage() {
  const [form, setForm] = useState<any>({
    full_name: "",
    given_name: "",
    family_name: "",
    date_of_birth: "",
    phone_number: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    address_country: "",
    personal_statement: "",
    parent_guardian_name: "",
    parent_guardian_email: "",
    parent_guardian_phone: "",
    emergency_contact_is_parent: false,
    emergency_contact_name: "",
    emergency_contact_email: "",
    emergency_contact_phone: "",
    resume_file: null,
    profile_files: [],
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const isNonEmpty = (v: any) =>
    v !== null &&
    v !== undefined &&
    !(typeof v === "string" && v.trim() === "");

  const isSectionComplete = (id: string) => {
    switch (id) {
      case "personal": {
        return (
          isNonEmpty(form.full_name) &&
          isNonEmpty(form.date_of_birth) &&
          isNonEmpty(form.phone_number) &&
          isNonEmpty(form.address_line1) &&
          isNonEmpty(form.address_city) &&
          isNonEmpty(form.address_state) &&
          isNonEmpty(form.address_postal_code) &&
          isNonEmpty(form.address_country)
        );
      }
      case "family": {
        const hasParentInfo =
          isNonEmpty(form.parent_guardian_name) &&
          isNonEmpty(form.parent_guardian_email) &&
          isNonEmpty(form.parent_guardian_phone);

        const emergencyIsParent = form.emergency_contact_is_parent === true;

        if (emergencyIsParent) {
          return hasParentInfo;
        }

        const hasEmergencyInfo =
          isNonEmpty(form.emergency_contact_name) &&
          isNonEmpty(form.emergency_contact_email) &&
          isNonEmpty(form.emergency_contact_phone);

        return hasParentInfo && hasEmergencyInfo;
      }
      case "writing": {
        return isNonEmpty(form.personal_statement);
      }
      case "experience": {
        return !!form.resume_file;
      }
      default:
        return false;
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setForm((prev: any) => ({ ...prev, ...data }));
      setLoading(false);
    })();
  }, []);

  const onChange = (k: string) => (e: any) =>
    setForm({ ...form, [k]: e.target.value });

  const nextSection = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const goToSection = (index: number) => {
    setCurrentSection(index);
  };

  async function onSave() {
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        given_name: form.given_name || null,
        family_name: form.family_name || null,
        date_of_birth: form.date_of_birth || null,
        phone_number: form.phone_number || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_postal_code: form.address_postal_code || null,
        address_country: form.address_country || null,
        personal_statement: form.personal_statement || null,
        parent_guardian_name: form.parent_guardian_name || null,
        parent_guardian_email: form.parent_guardian_email || null,
        parent_guardian_phone: form.parent_guardian_phone || null,
        emergency_contact_is_parent: form.emergency_contact_is_parent || false,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_email: form.emergency_contact_email || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        resume_file: form.resume_file || null,
        profile_files: Array.isArray(form.profile_files)
          ? form.profile_files
          : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (!error) setSaved(true);
  }

  if (loading) return <div className="p-6">Loading…</div>;

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Personal Info
        return (
          <div className="space-y-8">
            <div className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Personal Information
            </div>

            {/* Name Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Name
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Full name"
                  value={form.full_name || ""}
                  onChange={onChange("full_name")}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Given name (optional)"
                    value={form.given_name || ""}
                    onChange={onChange("given_name")}
                  />
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Family name (optional)"
                    value={form.family_name || ""}
                    onChange={onChange("family_name")}
                  />
                </div>
              </div>
            </div>

            {/* Birth Date Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Birth Date
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="date"
                  value={form.date_of_birth || ""}
                  onChange={onChange("date_of_birth")}
                />
              </div>
            </div>

            {/* Phone Number Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Phone Number
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone_number || ""}
                  onChange={onChange("phone_number")}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Address
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Address line 1"
                  value={form.address_line1 || ""}
                  onChange={onChange("address_line1")}
                />
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Address line 2 (optional)"
                  value={form.address_line2 || ""}
                  onChange={onChange("address_line2")}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                    value={form.address_city || ""}
                    onChange={onChange("address_city")}
                  />
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State/Province"
                    value={form.address_state || ""}
                    onChange={onChange("address_state")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Postal code"
                    value={form.address_postal_code || ""}
                    onChange={onChange("address_postal_code")}
                  />
                  <input
                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Country"
                    value={form.address_country || ""}
                    onChange={onChange("address_country")}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Family/Emergency Contact
        return (
          <div className="space-y-8">
            <div className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Family & Emergency Contact
            </div>

            {/* Parent/Guardian Information */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Parent/Guardian Information
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Parent/Guardian Name"
                  value={form.parent_guardian_name || ""}
                  onChange={onChange("parent_guardian_name")}
                />
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="email"
                  placeholder="Parent/Guardian Email"
                  value={form.parent_guardian_email || ""}
                  onChange={onChange("parent_guardian_email")}
                />
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  type="tel"
                  placeholder="Parent/Guardian Phone"
                  value={form.parent_guardian_phone || ""}
                  onChange={onChange("parent_guardian_phone")}
                />
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Emergency Contact
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="emergency_is_parent"
                    checked={form.emergency_contact_is_parent || false}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergency_contact_is_parent: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="emergency_is_parent"
                    className="text-sm text-gray-700"
                  >
                    Emergency contact is the same as parent/guardian above
                  </label>
                </div>

                {!form.emergency_contact_is_parent && (
                  <div className="space-y-4">
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Emergency Contact Name"
                      value={form.emergency_contact_name || ""}
                      onChange={onChange("emergency_contact_name")}
                    />
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      type="email"
                      placeholder="Emergency Contact Email"
                      value={form.emergency_contact_email || ""}
                      onChange={onChange("emergency_contact_email")}
                    />
                    <input
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      type="tel"
                      placeholder="Emergency Contact Phone"
                      value={form.emergency_contact_phone || ""}
                      onChange={onChange("emergency_contact_phone")}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2: // Writing
        return (
          <div className="space-y-8">
            <div className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Writing & Essays
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Personal Statement
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    Tell us about yourself, your goals, and what makes you
                    unique. This statement will be shared with programs that
                    enable profile autofill.
                  </div>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={8}
                    maxLength={5000}
                    placeholder="Write your personal statement here..."
                    value={form.personal_statement || ""}
                    onChange={onChange("personal_statement")}
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {form.personal_statement?.length || 0} / 5,000 characters
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Experience/Portfolio
        return (
          <div className="space-y-8">
            <div className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Experience & Portfolio
            </div>

            {/* Resume Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  Resume
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <ResumeUpload
                  currentResume={form.resume_file}
                  onResumeChange={(resume) =>
                    setForm({ ...form, resume_file: resume })
                  }
                />
              </div>
            </div>

            {/* Portfolio and Additional Files Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Portfolio and Additional Files
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Upload documents, portfolios, or other files that represent
                    your work and achievements.
                  </div>
                  <ProfileFileUpload
                    value={
                      Array.isArray(form.profile_files)
                        ? form.profile_files
                        : []
                    }
                    onChange={(arr) => setForm({ ...form, profile_files: arr })}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>

          <div className="space-y-2">
            {SECTIONS.map((section, index) => (
              <button
                key={section.id}
                onClick={() => goToSection(index)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentSection === index
                    ? "bg-blue-50 border border-blue-200 text-blue-900"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{section.icon}</span>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span>{section.title}</span>
                      {isSectionComplete(section.id) && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] border border-green-300">
                          ✓
                        </span>
                      )}
                    </div>
                    {!isSectionComplete(section.id) && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        {index === currentSection ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span>In progress</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Missing required info</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Save button */}
          <div className="mt-8">
            <button
              onClick={onSave}
              className="w-full rounded-xl px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Save Profile
            </button>
            {saved && (
              <div className="text-sm text-green-600 text-center mt-2">
                Saved!
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border p-8 min-h-[600px]">
            {renderSection()}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevSection}
              disabled={currentSection === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-500 self-center">
              Step {currentSection + 1} of {SECTIONS.length}
            </div>

            <button
              onClick={nextSection}
              disabled={currentSection === SECTIONS.length - 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
