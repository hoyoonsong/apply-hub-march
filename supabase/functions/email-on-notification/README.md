# email-on-notification

Sends emails when application results are published or unpublished. The email is sent to the account email (the email used to create the account).

## Setup Instructions

### Step 1: Deploy the Function

Deploy this function to Supabase:

```bash
supabase functions deploy email-on-notification
```

### Step 2: Set Environment Variables

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these environment variables:
   - `RESEND_API_KEY` - Your Resend API key (get it from https://resend.com/api-keys)
   - `SUPABASE_URL` - Your Supabase project URL (found in Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (found in Project Settings → API, under "service_role" secret)

### Step 3: Get the Function URL

1. In Supabase Dashboard, go to **Edge Functions**
2. Find `email-on-notification` in the list
3. Click on it to open the function details
4. Copy the **Invoke URL** (it looks like: `https://xxxxx.supabase.co/functions/v1/email-on-notification`)

### Step 4: Set Up the Database Webhook

This webhook automatically calls the email function whenever a notification is created:

1. In Supabase Dashboard, go to **Database** → **Webhooks**
2. Click **Create a new webhook**
3. Fill in the form:
   - **Name**: `email-on-results-published` (or any name you like)
   - **Table**: Select `public.notifications`
   - **Events**: Check only **INSERT** (we only want to send emails when new notifications are created)
   - **Type**: Select **HTTP Request**
   - **Method**: Select **POST**
   - **URL**: Paste the Invoke URL you copied in Step 3
   - **HTTP Headers**: Click "Add header" and add:
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_SERVICE_ROLE_KEY` (replace with your actual service role key)
4. Click **Save**

### Step 5: Test It

1. Publish a result for a test application (using the Publish Results page)
2. Check that:
   - A notification is created in the `notifications` table
   - An email is sent to the applicant's account email
3. Check the Edge Functions logs in Supabase Dashboard to see if the function ran successfully

## How It Works

1. When results are published, your database creates a notification in the `notifications` table with type `results_published`
2. The webhook automatically detects this new notification and calls this email function
3. The function gets the user's email from `auth.users` (the account email)
4. The function sends an email using Resend to that email address

## Troubleshooting

- **No emails being sent?** Check the Edge Functions logs in Supabase Dashboard
- **Webhook not firing?** Make sure the webhook is enabled and the URL is correct
- **Function errors?** Check that all environment variables are set correctly
