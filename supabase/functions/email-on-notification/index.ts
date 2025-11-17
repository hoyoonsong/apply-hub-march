import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "https://esm.sh/resend@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Edge Function: email-on-notification
 *
 * Sends emails when application results are published or unpublished.
 * Triggered by database webhook on notifications table INSERT events.
 *
 * Requirements:
 * - RESEND_API_KEY: Resend API key (set in Supabase Edge Functions secrets)
 * - RESEND_FROM_EMAIL: Verified domain email (e.g., noreply@omnipply.com)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 *
 * Webhook setup:
 * - Table: public.notifications
 * - Event: INSERT
 * - Target: This function's invoke URL
 */
serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    // Supabase database webhooks send: { type, table, record, old_record }
    // Handle both webhook format and direct API calls
    const record = payload.record || payload;
    const { user_id, title, message, data, type } = record;

    console.log("Processing notification:", { type, user_id, title });

    // Only process results_published and results_unpublished notifications
    if (!["results_published", "results_unpublished"].includes(type)) {
      console.log("Ignoring notification type:", type);
      return new Response("ignored");
    }

    // Get recipient email from auth.users (the account email used to create the account)
    // This is the primary source - the email the user signed up with
    let email: string | null = null;

    try {
      const { data: authUser, error: authError } =
        await supabase.auth.admin.getUserById(user_id);
      if (!authError && authUser?.user?.email) {
        email = authUser.user.email;
        console.log("Found email from auth.users:", email);
      }
    } catch (error) {
      console.error("Error getting user from auth.users:", error);
    }

    // Fallback: try profiles table if auth.users doesn't have email
    if (!email) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();
        email = profile?.email ?? null;
        if (email) {
          console.log("Found email from profiles:", email);
        }
      } catch (error) {
        console.error("Error getting user from profiles:", error);
      }
    }

    // If no email found, return error
    if (!email) {
      console.error("No email found for user_id:", user_id);
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Sending email to:", email);

    // Get "from" email from environment variable (must be from verified domain)
    // Set RESEND_FROM_EMAIL secret in Supabase (e.g., noreply@omnipply.com)
    // Falls back to onboarding@resend.dev for testing if not set
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    console.log("Sending from:", fromEmail);

    // Fetch publication details to include in email
    let publicationData: any = null;
    if (data?.publication_id) {
      try {
        const { data: pub } = await supabase
          .from("application_publications")
          .select(
            `
            id,
            visibility,
            payload,
            published_at,
            applications!inner(
              id,
              programs!inner(
                id,
                name,
                organizations!inner(
                  name,
                  slug
                )
              )
            )
          `
          )
          .eq("id", data.publication_id)
          .single();

        if (pub) {
          publicationData = pub;
          console.log("Fetched publication data:", pub);
        }
      } catch (error) {
        console.error("Error fetching publication data:", error);
      }
    }

    // Build email HTML and plain text versions
    const { html: emailHtml, text: emailText } = buildEmailContent({
      message,
      data,
      publicationData,
      type,
    });

    // Improve subject line for better deliverability
    // Make it more specific and less generic
    let improvedSubject = title;
    if (publicationData?.applications?.programs?.name) {
      const programName = publicationData.applications.programs.name;
      improvedSubject = `Application Update: ${programName} - ${title}`;
    }

    try {
      // Send email via Resend with improved deliverability settings
      const emailOptions: any = {
        from: `Omnipply <${fromEmail}>`, // Use a friendly "from" name (better than just email)
        to: email,
        subject: improvedSubject, // Use improved subject line
        html: emailHtml,
        text: emailText, // Plain text version for better deliverability
        headers: {
          "List-Unsubscribe": "<https://omnipply.com/unsubscribe>", // Help with spam filters
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": data?.publication_id || "", // Add tracking ID for better reputation
        },
      };

      // Add reply-to (defaults to omnipply@gmail.com if no secret provided)
      const replyToEmail =
        Deno.env.get("RESEND_REPLY_TO") || "omnipply@gmail.com";
      if (replyToEmail) {
        emailOptions.replyTo = replyToEmail;
      }

      const result = await resend.emails.send(emailOptions);

      // Resend returns errors in the response object, not as exceptions
      // Check for errors in the response
      if (result.error) {
        console.error("Resend API error:", result.error);
        return new Response(
          JSON.stringify({
            error: "Failed to send email",
            details: result.error,
            message:
              "Make sure you've verified your domain in Resend and RESEND_FROM_EMAIL is set correctly.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Success - email sent
      console.log("Email sent successfully:", result);
      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle unexpected errors (network issues, etc.)
      console.error("Error sending email:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Function error", details: error }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Build email content (both HTML and plain text versions)
 */
function buildEmailContent({
  message,
  data,
  publicationData,
  type,
}: {
  message: string;
  data: any;
  publicationData: any;
  type: string;
}): { html: string; text: string } {
  const visibility = publicationData?.visibility || {};
  const payload = publicationData?.payload || {};
  const program = publicationData?.applications?.programs;
  const org = program?.organizations;
  const programName = program?.name || "your application";
  const orgName = org?.name || "";

  // Determine what to show based on visibility settings
  const showDecision = visibility.decision && payload.decision;
  const showScore = visibility.score && payload.score !== null;
  const showComments = visibility.comments && payload.comments;
  const customMessage = visibility.customMessage;

  // Format decision text
  const getDecisionText = (decision: string) => {
    const decisionMap: Record<string, string> = {
      accept: "Accepted",
      waitlist: "Waitlisted",
      reject: "Not Accepted",
    };
    return decisionMap[decision.toLowerCase()] || decision;
  };

  const getDecisionColor = (decision: string) => {
    const colorMap: Record<string, string> = {
      accept: "#10b981", // green
      waitlist: "#f59e0b", // amber
      reject: "#ef4444", // red
    };
    return colorMap[decision.toLowerCase()] || "#6b7280";
  };

  // Build plain text version
  const textParts: string[] = [];
  textParts.push("Your Results Are Available");
  textParts.push("");
  textParts.push("Hello,");
  textParts.push("");
  textParts.push(escapeHtml(message));
  textParts.push("");
  textParts.push(
    "You can view your complete results and any additional details by visiting the link below."
  );
  textParts.push("");

  if (programName && programName !== "your application") {
    textParts.push(`Program: ${escapeHtml(programName)}`);
    if (orgName) {
      textParts.push(`Organization: ${escapeHtml(orgName)}`);
    }
    textParts.push("");
  }

  if (showDecision) {
    textParts.push(
      `Decision: ${escapeHtml(getDecisionText(payload.decision))}`
    );
    textParts.push("");
  }

  if (showScore) {
    textParts.push(`Score: ${escapeHtml(String(payload.score))}`);
    textParts.push("");
  }

  if (showComments) {
    textParts.push("Reviewer Comments:");
    textParts.push(escapeHtml(payload.comments));
    textParts.push("");
  }

  if (customMessage) {
    textParts.push(escapeHtml(customMessage));
    textParts.push("");
  }

  textParts.push(
    "View your full results at: https://omnipply.com/my-submissions"
  );
  textParts.push("");
  textParts.push(
    "This email was sent to notify you about your application results."
  );
  textParts.push(
    "If you have questions, please reply to this email or contact us at omnipply@gmail.com"
  );
  textParts.push("");
  textParts.push("Omnipply - https://omnipply.com");

  const emailText = textParts.join("\n");

  // Build HTML version
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Results Are Available</title>
</head>
<body style="margin: 0; padding: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.2;">Your Results Are Available</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                ${escapeHtml(message)}
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                You can view your complete results and any additional details by clicking the button below.
              </p>
              
              ${
                programName && programName !== "your application"
                  ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Program</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #111827;">${escapeHtml(
                  programName
                )}</p>
                ${
                  orgName
                    ? `<p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${escapeHtml(
                        orgName
                      )}</p>`
                    : ""
                }
              </div>
              `
                  : ""
              }
              
              ${
                showDecision
                  ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid ${getDecisionColor(
                payload.decision
              )};">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Decision</p>
                <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: ${getDecisionColor(
                  payload.decision
                )};">
                  ${escapeHtml(getDecisionText(payload.decision))}
                </p>
              </div>
              `
                  : ""
              }
              
              ${
                showScore
                  ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #eff6ff; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Score</p>
                <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #2563eb;">${escapeHtml(
                  String(payload.score)
                )}</p>
              </div>
              `
                  : ""
              }
              
              ${
                showComments
                  ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #10b981;">
                <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Reviewer Comments</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #111827; white-space: pre-wrap;">${escapeHtml(
                  payload.comments
                )}</p>
              </div>
              `
                  : ""
              }
              
              ${
                customMessage
                  ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #92400e; white-space: pre-wrap;">${escapeHtml(
                  customMessage
                )}</p>
              </div>
              `
                  : ""
              }
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://omnipply.com/my-submissions" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; line-height: 1.5;">View Full Results</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-align: center; line-height: 1.5;">
                This email was sent to notify you about your application results.<br>
                If you have questions, please reply to this email or contact us at <a href="mailto:omnipply@gmail.com" style="color:#3b82f6;text-decoration:none;">omnipply@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">
                <a href="https://omnipply.com/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | 
                <a href="https://omnipply.com" style="color: #9ca3af; text-decoration: underline;">Omnipply</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { html: emailHtml, text: emailText };
}
