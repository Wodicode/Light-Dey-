# PowerWatch Nigeria — WhatsApp Bot Edge Function

## Overview

This Deno edge function connects Meta's WhatsApp Cloud API to the PowerWatch Nigeria Supabase backend. Users can log outages by sending plain-text messages to a dedicated WhatsApp number.

---

## 1. Run the schema migration

In the Supabase SQL editor (or via `supabase db push`) run:

```
supabase/whatsapp_schema.sql
```

This:
- Adds `whatsapp_number` column to `profiles`
- Creates the `start_outage_by_phone`, `end_outage_by_phone`, and `get_active_outage_by_phone` RPCs (all `SECURITY DEFINER`)

---

## 2. Set Supabase secrets

```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN=<your-random-secret>
supabase secrets set WHATSAPP_ACCESS_TOKEN=<meta-permanent-token>
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<meta-phone-number-id>

# Optional — enables HMAC payload verification (strongly recommended in production)
supabase secrets set WHATSAPP_APP_SECRET=<meta-app-secret>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase into all edge functions — you do **not** need to set them.

---

## 3. Deploy the edge function

```bash
supabase functions deploy whatsapp-bot --no-verify-jwt
```

The `--no-verify-jwt` flag is required because Meta sends unauthenticated requests; the function handles its own verification via `WHATSAPP_VERIFY_TOKEN` (GET) and optionally `WHATSAPP_APP_SECRET` HMAC (POST).

The deployed URL will be:

```
https://<project-ref>.supabase.co/functions/v1/whatsapp-bot
```

---

## 4. Configure the Meta webhook

In the [Meta Developer Console](https://developers.facebook.com/) under your WhatsApp Business App:

| Field | Value |
|---|---|
| **Callback URL** | `https://<project-ref>.supabase.co/functions/v1/whatsapp-bot` |
| **Verify Token** | Value you set in `WHATSAPP_VERIFY_TOKEN` |
| **Webhook Fields** | `messages` (subscribe to this field) |

---

## 5. Let users link their WhatsApp number

In the app's Settings screen, users enter their WhatsApp number. It is saved to `profiles.whatsapp_number`. The number can be stored in any common Nigerian format — the RPCs normalise it by stripping the leading `+` before matching.

---

## Supported commands

| What to send | Action |
|---|---|
| `off` · `light off` · `nepa` · `no light` · `light don go` | Start logging an outage |
| `on` · `light on` · `back` · `nepa don come` · `light don come` | End the active outage |
| `status` | Check whether an outage is currently active |
| `help` | Show command list |

Commands are case-insensitive.

---

## Architecture notes

- The function always returns HTTP 200 to Meta, even on internal errors. Returning 4xx/5xx causes Meta to retry the delivery for up to 7 days.
- When `WHATSAPP_APP_SECRET` is set, the function verifies the `x-hub-signature-256` header using a constant-time HMAC comparison.
- All database calls use the service role key via Supabase RPCs, bypassing RLS safely.
- Non-text messages (images, reactions, status updates) are silently ignored.
