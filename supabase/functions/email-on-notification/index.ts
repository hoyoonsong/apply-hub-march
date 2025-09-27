import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "https://esm.sh/resend@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { record } = await req.json(); // row from public.notifications
  const { user_id, title, message, data, type } = record;

  if (!["results_published", "results_unpublished"].includes(type)) {
    return new Response("ignored");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user_id)
    .single();

  if (profile?.email) {
    await resend.emails.send({
      from: "noreply@omnipply.com",
      to: profile.email,
      subject: title,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;">
          <p>${message}</p>
          <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">
${JSON.stringify(data ?? {}, null, 2)}
          </pre>
        </div>`,
    });
  }

  return new Response("ok");
});
