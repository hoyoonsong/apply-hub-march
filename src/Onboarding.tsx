import { useState } from "react";
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h1 className="mb-4 text-2xl sm:text-3xl font-semibold text-gray-900">
          Create your account
        </h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="mb-4 w-full h-10 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <label className="mb-6 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          I agree to the Terms & Privacy Policy
        </label>
        <button
          disabled={!agree || busy}
          onClick={submit}
          className="w-full h-10 rounded-lg bg-black hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed px-4 text-white font-medium transition-colors"
        >
          {busy ? "Saving…" : "Finish sign up"}
        </button>
      </div>
    </div>
  );
}
