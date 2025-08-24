import Button from "./Button";
import { supabase } from "../lib/supabaseClient";

export default function GoogleSignIn({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + redirectTo },
    });
    if (error) alert(error.message);
  }
  return (
    <Button onClick={signIn} className="bg-blue-600 hover:bg-blue-700">
      Sign in with Google
    </Button>
  );
}
