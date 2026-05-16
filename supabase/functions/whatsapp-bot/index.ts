// PowerWatch Nigeria — WhatsApp Bot Edge Function
// Runtime: Deno (Supabase Edge Functions)
// Meta WhatsApp Cloud API v17.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
      }>;
      statuses?: unknown[];
    };
    field: string;
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

interface RpcResult {
  success?: boolean;
  error?: string;
  outage_id?: string;
  started_at?: string;
  duration_minutes?: number;
  duration_formatted?: string;
  active?: boolean;
  elapsed_formatted?: string;
  elapsed_minutes?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WHATSAPP_VERIFY_TOKEN    = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const WHATSAPP_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
// Optional — enables HMAC signature verification of Meta payloads
const WHATSAPP_APP_SECRET      = Deno.env.get('WHATSAPP_APP_SECRET');

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client (service role — bypasses RLS)
// ─────────────────────────────────────────────────────────────────────────────

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta signature verification (HMAC-SHA256)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyMetaSignature(
  rawBody: ArrayBuffer,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!WHATSAPP_APP_SECRET) return true; // secret not configured → skip
  if (!signatureHeader) return false;

  const [algo, hexSig] = signatureHeader.split('=');
  if (algo !== 'sha256' || !hexSig) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WHATSAPP_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const mac = await crypto.subtle.sign('HMAC', key, rawBody);
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== hexSig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ hexSig.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command classification
// ─────────────────────────────────────────────────────────────────────────────

type Command = 'start' | 'end' | 'status' | 'help' | 'unknown';

function classifyMessage(text: string): Command {
  const t = text.trim().toLowerCase();

  const startPatterns = [
    /^off$/,
    /^light\s*off$/,
    /^nepa$/,
    /^no\s*light$/,
    /^light\s*don\s*go$/,
    /^current\s*off$/,
    /^no\s*current$/,
    /^darkness$/,
  ];

  const endPatterns = [
    /^on$/,
    /^light\s*on$/,
    /^light\s*don\s*come$/,
    /^nepa\s*don\s*come$/,
    /^current\s*on$/,
    /^back$/,
    /^power\s*on$/,
    /^power\s*back$/,
    /^up\s*nepa$/,
    /^e\s*don\s*come$/,
  ];

  if (startPatterns.some((re) => re.test(t))) return 'start';
  if (endPatterns.some((re) => re.test(t))) return 'end';
  if (/^status$/.test(t)) return 'status';
  if (/^help$/.test(t)) return 'help';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Reply messages
// ─────────────────────────────────────────────────────────────────────────────

const HELP_MESSAGE = `*PowerWatch Nigeria* — WhatsApp Commands

*To log an outage:*
  off  •  light off  •  nepa  •  no light  •  light don go

*To end an outage:*
  on  •  light on  •  back  •  nepa don come  •  light don come

*To check current outage:*
  status

*More help:*
  help

_Messages are not case-sensitive._`;

const UNREGISTERED_MESSAGE =
  "Your number isn't linked to a PowerWatch account. Open the app → Settings → scroll to WhatsApp and add your number.";

function startSuccessMessage(startedAt: string): string {
  const d = new Date(startedAt);
  const time = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });
  return `Outage logged! ⚡ Started at *${time}*.\n\nSend *on* or *light on* when power is restored.`;
}

function alreadyActiveMessage(startedAt: string): string {
  const d = new Date(startedAt);
  const time = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });
  return `You already have an active outage that started at *${time}*.\n\nSend *on* when power returns.`;
}

function endSuccessMessage(duration: string): string {
  return `Power restored! 💡 Outage duration: *${duration}*.\n\nThe log has been saved in your PowerWatch app.`;
}

function noActiveOutageMessage(): string {
  return "No active outage found. Send *off* (or *light off*) to start logging.";
}

function statusActiveMessage(elapsed: string): string {
  return `Active outage — running for *${elapsed}* so far.\n\nSend *on* or *light on* when power returns.`;
}

function statusNoOutageMessage(): string {
  return "No active outage at the moment. Send *off* to start logging.";
}

function unknownCommandMessage(): string {
  return (
    "Didn't catch that. Here's what I understand:\n\n" +
    "*off* — log outage  •  *on* — end outage  •  *status*  •  *help*"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta Cloud API: send a WhatsApp text message
// ─────────────────────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[whatsapp-bot] Failed to send message to ${to}:`, errBody);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleStart(supabase: ReturnType<typeof makeSupabase>, phone: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_outage_by_phone', { p_phone: phone });

  if (error) {
    console.error('[whatsapp-bot] start_outage_by_phone RPC error:', error);
    return 'Something went wrong on our end. Please try again.';
  }

  const result = data as RpcResult;

  if (result.error === 'unregistered') return UNREGISTERED_MESSAGE;
  if (result.error === 'already_active') return alreadyActiveMessage(result.started_at!);
  if (result.success) return startSuccessMessage(result.started_at!);
  return 'Something went wrong. Please try again.';
}

async function handleEnd(supabase: ReturnType<typeof makeSupabase>, phone: string): Promise<string> {
  const { data, error } = await supabase.rpc('end_outage_by_phone', { p_phone: phone });

  if (error) {
    console.error('[whatsapp-bot] end_outage_by_phone RPC error:', error);
    return 'Something went wrong on our end. Please try again.';
  }

  const result = data as RpcResult;

  if (result.error === 'unregistered') return UNREGISTERED_MESSAGE;
  if (result.error === 'no_active_outage') return noActiveOutageMessage();
  if (result.success) return endSuccessMessage(result.duration_formatted!);
  return 'Something went wrong. Please try again.';
}

async function handleStatus(supabase: ReturnType<typeof makeSupabase>, phone: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_active_outage_by_phone', { p_phone: phone });

  if (error) {
    console.error('[whatsapp-bot] get_active_outage_by_phone RPC error:', error);
    return 'Something went wrong on our end. Please try again.';
  }

  const result = data as RpcResult;

  if (result.error === 'unregistered') return UNREGISTERED_MESSAGE;
  if (result.active) return statusActiveMessage(result.elapsed_formatted!);
  return statusNoOutageMessage();
}

// ─────────────────────────────────────────────────────────────────────────────
// Process a single inbound WhatsApp message
// ─────────────────────────────────────────────────────────────────────────────

async function processMessage(from: string, messageBody: string): Promise<void> {
  const supabase = makeSupabase();
  const command  = classifyMessage(messageBody);

  let reply: string;

  switch (command) {
    case 'start':
      reply = await handleStart(supabase, from);
      break;
    case 'end':
      reply = await handleEnd(supabase, from);
      break;
    case 'status':
      reply = await handleStatus(supabase, from);
      break;
    case 'help':
      reply = HELP_MESSAGE;
      break;
    default:
      reply = unknownCommandMessage();
  }

  await sendWhatsAppMessage(from, reply);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // ── GET: Meta webhook verification handshake ──────────────────────────────
  if (req.method === 'GET') {
    const url    = new URL(req.url);
    const mode   = url.searchParams.get('hub.mode');
    const token  = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      console.log('[whatsapp-bot] Webhook verified by Meta.');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: Inbound message payload from Meta ───────────────────────────────
  if (req.method === 'POST') {
    // Always return 200 to Meta — if we return 4xx/5xx, Meta will retry.
    // Errors are caught and logged; the 200 is always sent.

    let rawBody: ArrayBuffer;
    let payload: MetaWebhookPayload;

    try {
      rawBody = await req.arrayBuffer();

      // Verify HMAC signature when app secret is configured
      const signature = req.headers.get('x-hub-signature-256');
      const valid     = await verifyMetaSignature(rawBody, signature);
      if (!valid) {
        console.warn('[whatsapp-bot] Invalid x-hub-signature-256 — dropping request.');
        // Still 200 to avoid Meta treating this as a server error
        return new Response('OK', { status: 200 });
      }

      payload = JSON.parse(new TextDecoder().decode(rawBody)) as MetaWebhookPayload;
    } catch (err) {
      console.error('[whatsapp-bot] Failed to parse request body:', err);
      return new Response('OK', { status: 200 });
    }

    // Ignore non-WhatsApp objects (e.g. Instagram)
    if (payload.object !== 'whatsapp_business_account') {
      return new Response('OK', { status: 200 });
    }

    // Process each message entry — fire-and-forget inside a try/catch so a
    // single bad message never causes the whole batch to fail.
    const tasks: Promise<void>[] = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue; // status updates, etc.

        for (const msg of value.messages) {
          if (msg.type !== 'text' || !msg.text?.body) continue;

          const from = msg.from; // E.164 without the +, e.g. "2348012345678"
          const body = msg.text.body;

          console.log(`[whatsapp-bot] Message from ${from}: "${body}"`);

          tasks.push(
            processMessage(from, body).catch((err) => {
              console.error(`[whatsapp-bot] Error processing message from ${from}:`, err);
            }),
          );
        }
      }
    }

    // Wait for all messages to be processed before returning
    await Promise.all(tasks);

    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
