# email-on-notification

Sends emails on results publish/unpublish.

## Deploy

```bash
supabase functions deploy email-on-notification
```

## Env

- RESEND_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Webhook

Supabase Dashboard → Database → Webhooks → Table = public.notifications, Event = INSERT, Target = HTTP → the URL of this function (Functions → email-on-notification → Invoke URL).
