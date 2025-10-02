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
      className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 md:py-2 md:px-6 rounded-md md:rounded-lg transition-colors shadow-md md:shadow-lg text-xs md:text-base ${className}`}
    >
      Sign out
    </button>
  );
}
