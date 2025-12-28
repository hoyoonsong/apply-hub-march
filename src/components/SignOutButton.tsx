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
      className={`bg-[#1F3A52] hover:bg-[#1a2f42] text-white font-semibold py-2 px-3 md:py-2.5 md:px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl shadow-[#1F3A52]/40 hover:shadow-[#1F3A52]/50 transform hover:scale-105 active:scale-95 text-xs md:text-base ${className}`}
    >
      Sign out
    </button>
  );
}
