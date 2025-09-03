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
      className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 sm:py-2 sm:px-5 md:py-2 md:px-6 rounded-lg transition-colors shadow-lg text-sm sm:text-base ${className}`}
    >
      Sign out
    </button>
  );
}
