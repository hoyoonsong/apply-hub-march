import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut();
        nav("/", { replace: true });
      }}
      className={`rounded-lg border px-3 py-2 hover:bg-gray-50 ${className}`}
    >
      Sign out
    </button>
  );
}
