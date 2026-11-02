import { resolveCorsOrigin } from './cors.js';
/**
 * Subscribe Endpoint Handler
 * Handles newsletter/lead magnet subscriptions
 * Sends welcome email with starter kit links via SendGrid
 *
 * Environment variables required:
 * - SENDGRID_API_KEY: SendGrid API key for email
 * - ADMIN_EMAIL: Email to receive notifications
 */

/**
 * Email validation regex (RFC 5322 simplified)
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
};

/**
 * Validate subscribe request payload
 */
const validateSubscribeRequest = (body) => {
  if (!body?.email || !isValidEmail(body.email)) {
    return { valid: false, error: 'Valid email address is required' };
  }

  return {
    valid: true,
    data: {
      email: body.email.toLowerCase().trim(),
      source: body.source || 'lead-magnet',
    },
  };
};

/**
 * Check rate-limiting using Cloudflare KV
 * Limit: 3 subscriptions per IP per hour
 *
 * KV-WRITE EFFICIENT (Nov 2026): the old version did 1 KV PUT per
 * request and burned the 1,000/day free tier. This version counts in
 * worker memory (per isolate) and touches KV sparingly — one cheap GET
 * to hydrate a cold isolate, and a PUT only on block or every 10th hit.
 * All KV writes are fail-open: a KV outage or spent quota must never
 * 500 the endpoint; the in-memory count still enforces the limit.
 */
const memLimits = new Map();

const checkRateLimit = async (kv, clientIp) => {
  if (!kv) {
    // If KV is not configured, allow the request but log a warning
    console.warn('RATE_LIMIT KV namespace not configured');
    return { allowed: true, remaining: 999 };
  }

  const key = `ratelimit:subscribe:${clientIp}`;
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  let entry = memLimits.get(key);
  if (!entry || entry.timestamp < oneHourAgo) {
    let stored = null;
    try { stored = await kv.get(key, 'json'); } catch { stored = null; }
    entry = (stored && typeof stored.count === 'number' && stored.timestamp >= oneHourAgo)
      ? { count: stored.count, timestamp: stored.timestamp }
      : { count: 0, timestamp: now };
    memLimits.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= 3) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.timestamp + 3600000 - now) / 1000) };
  }

  entry.count += 1;

  // Persist sparingly: on block, or every 10th hit so an evicted
  // isolate doesn't lose the window.
  if (entry.count >= 3 || entry.count % 10 === 0) {
    try {
      await kv.put(key, JSON.stringify(entry), { expirationTtl: 3600 });
    } catch (e) {
      console.warn('subscribe rate-limit KV put failed (fail-open):', e && e.message);
    }
  }

  return { allowed: true, remaining: 3 - entry.count };
};

/**
 * Send subscription notification via Web3Forms
 */
const sendViaWeb3Forms = async (email, source, web3FormsKey) => {
  const url = 'https://api.web3forms.com/submit';

  const payload = {
    access_key: web3FormsKey,
    subject: `New Newsletter Subscription via ${source}`,
    from_name: 'TechGuru Subscription Module',
    email: email,
    'Source': source
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Web3Forms subscription failed (${response.status}):`, errorText);
      throw new Error(`Web3Forms failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Web3Forms Subscribe Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get client IP from request
 */
const getClientIp = (request) => {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    'unknown'
  );
};

import { sendTelegramMessage } from './notifications';

/**
 * Main subscribe handler
 */
export const handleSubscribe = async (request, env, ctx, origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();

    // Validate request
    const validation = validateSubscribeRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check rate-limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(env.RATE_LIMIT, clientIp);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      );
    }

    // Check for API keys
    const web3FormsKey = env.WEB3FORMS_ACCESS_KEY;

    if (!web3FormsKey) {
      console.error('WEB3FORMS_ACCESS_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Form service is not properly configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Send subscription form via Web3Forms
    const emailResult = await sendViaWeb3Forms(
      validation.data.email,
      validation.data.source,
      web3FormsKey
    );

    if (!emailResult.success) {
      return new Response(
        JSON.stringify({ error: 'Failed to complete subscription. Please try again.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Send Telegram Notification
    ctx.waitUntil((async () => {
      const tgMessage = `📬 <b>New Newsletter Signup!</b>\n\n` +
        `📮 <b>Email:</b> ${validation.data.email}\n` +
        `📱 <b>Source:</b> ${validation.data.source}`;
      
      await sendTelegramMessage(env, tgMessage);
    })());

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Success! Check your inbox for the starter kit.',
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Subscribe Handler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: corsHeaders }
    );
  }
};
