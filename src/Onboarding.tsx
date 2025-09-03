import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async () => {
    setBusy(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return nav("/", { replace: true });
    await supabase
      .from("profiles")
      .update({
        full_name: name || null,
        onboarded_at: new Date().toISOString(),
        accepted_terms_at: agree ? new Date().toISOString() : null,
      })
      .eq("id", session.user.id);
    setBusy(false);
    nav("/dashboard", { replace: true });
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border p-6">
      <h1 className="mb-2 text-2xl font-semibold">Create your account</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="mb-4 w-full rounded-lg border px-3 py-2"
      />
      <label className="mb-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        I agree to the Terms & Privacy Policy
      </label>
      <button
        disabled={!agree || busy}
        onClick={submit}
        className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Finish sign up"}
      </button>
    </div>
  );
}
