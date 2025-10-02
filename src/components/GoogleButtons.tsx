import { supabase } from "../lib/supabase";

function startOAuth(intent: "signup" | "login") {
  sessionStorage.setItem("authIntent", intent);

  // Get the next parameter from URL to pass through OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const nextParam = urlParams.get("next");

  // If no next param in URL, use current pathname as the redirect destination
  const redirectDestination = nextParam || window.location.pathname;

  const redirectUrl = `${
    window.location.origin
  }/post-auth?next=${encodeURIComponent(redirectDestination)}`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: { prompt: "select_account" },
    },
  });
}

export const GoogleSignupButton = () => (
  <button
    type="button"
    onClick={async () => {
      const { error } = await startOAuth("signup");
      if (error) alert(error.message);
    }}
    className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
  >
    Sign up with Google
  </button>
);

export const GoogleLoginButton = () => (
  <button
    type="button"
    onClick={async () => {
      const { error } = await startOAuth("login");
      if (error) alert(error.message);
    }}
    className="w-full rounded-lg border px-4 py-2 font-medium hover:bg-gray-50"
  >
    Log in with Google
  </button>
);
