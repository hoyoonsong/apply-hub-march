"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import ProfileFileUpload from "../components/profile/ProfileFileUpload";

export default function ProfilePage() {
  const [form, setForm] = useState<any>({
    full_name: "",
    given_name: "",
    family_name: "",
    date_of_birth: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    address_country: "",
    personal_statement: "",
    profile_files: [],
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_postal_code: form.address_postal_code || null,
        address_country: form.address_country || null,
        personal_statement: form.personal_statement || null,
        profile_files: Array.isArray(form.profile_files)
          ? form.profile_files
          : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (!error) setSaved(true);
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Profile</h1>

      <div className="grid grid-cols-1 gap-4">
        <input
          className="border rounded-xl p-2"
          placeholder="Full name"
          value={form.full_name || ""}
          onChange={onChange("full_name")}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            className="border rounded-xl p-2"
            placeholder="Given name (optional)"
            value={form.given_name || ""}
            onChange={onChange("given_name")}
          />
          <input
            className="border rounded-xl p-2"
            placeholder="Family name (optional)"
            value={form.family_name || ""}
            onChange={onChange("family_name")}
          />
        </div>
        <input
          className="border rounded-xl p-2"
          type="date"
          value={form.date_of_birth || ""}
          onChange={onChange("date_of_birth")}
        />
        <input
          className="border rounded-xl p-2"
          placeholder="Address line 1"
          value={form.address_line1 || ""}
          onChange={onChange("address_line1")}
        />
        <input
          className="border rounded-xl p-2"
          placeholder="Address line 2"
          value={form.address_line2 || ""}
          onChange={onChange("address_line2")}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            className="border rounded-xl p-2"
            placeholder="City"
            value={form.address_city || ""}
            onChange={onChange("address_city")}
          />
          <input
            className="border rounded-xl p-2"
            placeholder="State/Province"
            value={form.address_state || ""}
            onChange={onChange("address_state")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            className="border rounded-xl p-2"
            placeholder="Postal code"
            value={form.address_postal_code || ""}
            onChange={onChange("address_postal_code")}
          />
          <input
            className="border rounded-xl p-2"
            placeholder="Country"
            value={form.address_country || ""}
            onChange={onChange("address_country")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personal Statement
          </label>
          <textarea
            className="w-full rounded-xl border p-3"
            rows={6}
            maxLength={5000}
            value={form.personal_statement || ""}
            onChange={onChange("personal_statement")}
          />
        </div>

        <ProfileFileUpload
          value={Array.isArray(form.profile_files) ? form.profile_files : []}
          onChange={(arr) => setForm({ ...form, profile_files: arr })}
        />

        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="rounded-2xl px-4 py-2 bg-black text-white"
          >
            Save
          </button>
          {saved && (
            <div className="text-sm text-green-600 self-center">Saved.</div>
          )}
        </div>
      </div>
    </div>
  );
}
