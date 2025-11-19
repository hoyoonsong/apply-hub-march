import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { submitForm } from "../services/forms";

interface OrganizationSignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OrganizationSignupModal({
  open,
  onClose,
  onSuccess,
}: OrganizationSignupModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    if (!description.trim()) {
      setError("Organization description is required");
      return;
    }

    if (!contactName.trim()) {
      setError("Contact name is required");
      return;
    }

    if (!contactEmail.trim()) {
      setError("Contact email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!contactPhone.trim()) {
      setError("Contact phone number is required");
      return;
    }

    if (!website.trim()) {
      setError("Website is required");
      return;
    }

    if (!/^https?:\/\/.+/.test(website.trim())) {
      setError(
        "Please enter a valid website URL (starting with http:// or https://)"
      );
      return;
    }

    if (!meetingTime.trim()) {
      setError("Please let us know what time we're meeting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitForm(
        "organization_signup",
        {
          name: name.trim(),
          description: description.trim() || null,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          website: website.trim() || null,
          meeting_time: meetingTime.trim() || null,
        },
        user?.id || null
      );

      setSuccess(true);
      setName("");
      setDescription("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setWebsite("");
      setMeetingTime("");

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName("");
      setDescription("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setWebsite("");
      setMeetingTime("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
        >
          ✕
        </button>

        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Organization Signup
        </h2>

        {success ? (
          <div className="py-4">
            <div className="rounded-lg bg-green-50 p-4 text-green-800">
              <p className="font-semibold">Thank you for your interest!</p>
              <p className="mt-1 text-sm">
                Your organization signup request has been submitted. We'll
                review it and get back to you soon.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="org-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <label
                htmlFor="org-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={submitting}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                placeholder="Tell us about your organization..."
              />
            </div>

            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="contact-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Website <span className="text-red-500">*</span>
              </label>
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="https://www.example.com"
              />
            </div>

            {/* Schedule Meeting */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Schedule a Meeting <span className="text-red-500">*</span>
              </label>
              <a
                href="https://calendly.com/hoyoonsong/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Click here to schedule a meeting
              </a>

              <div className="mt-4">
                <label
                  htmlFor="meeting-time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  What time are we meeting?
                </label>
                <input
                  id="meeting-time"
                  type="text"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  required
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., Wednesday, November 12, 2025 at 2:00 PM"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
