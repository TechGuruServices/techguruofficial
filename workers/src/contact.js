import { resolveCorsOrigin } from './cors.js';
/**
 * Contact Form Endpoint Handler
 * Validates form data, applies rate-limiting, sends emails via Zoho Mail
 * 
 * Environment variables required:
 * - ZOHO_MAIL_API_KEY: Zoho Mail API key
 * - NOTIFICATION_EMAIL: Email to receive notifications (lucas@techguruofficial.us)
 * - REPLY_TO_EMAIL: Reply-to email (info@techguruofficial.us)
 * - SENDGRID_API_KEY (alternative): SendGrid API key for email
 */

/**
 * Email validation regex (RFC 5322 simplified)
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
};

/**
 * Sanitize text input - prevent XSS.
 * Strips HTML tags and escapes the remaining HTML-significant characters,
 * instead of deleting legitimate characters like @ + : ; " / or accents
 * (which broke phone numbers, emails, URLs and names like José).
 */
const sanitizeText = (text, maxLength = 1000) => {
  if (typeof text !== 'string') return '';

  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .slice(0, maxLength);
};

/**
 * Validate contact form payload
 */
const validateContactRequest = (body) => {
  const errors = [];

  // Name validation
  if (!body?.name || typeof body.name !== 'string') {
    errors.push('Name is required');
  } else if (body.name.length < 2 || body.name.length > 100) {
    errors.push('Name must be between 2-100 characters');
  }

  // Email validation
  if (!body?.email || !isValidEmail(body.email)) {
    errors.push('Valid email address is required');
  }

  // Message validation
  if (!body?.message || typeof body.message !== 'string') {
    errors.push('Message is required');
  } else if (body.message.length < 10 || body.message.length > 5000) {
    errors.push('Message must be between 10-5000 characters');
  }

  // Subject validation (optional)
  if (body?.subject && typeof body.subject === 'string') {
    if (body.subject.length > 200) {
      errors.push('Subject must be under 200 characters');
    }
  }

  // Company validation (optional)
  if (body?.company && typeof body.company !== 'string') {
    errors.push('Company name must be a string');
  }

  // Phone validation (optional)
  if (body?.phone && typeof body.phone !== 'string') {
    errors.push('Phone number must be a string');
  }

  // Service validation (optional but recommended)
  if (body?.service && typeof body.service !== 'string') {
    errors.push('Service selection must be a string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name: sanitizeText(body.name, 100),
      email: body.email.toLowerCase().trim(),
      message: sanitizeText(body.message, 5000),
      subject: body.subject ? sanitizeText(body.subject, 200) : 'New TechGuru Contact Form Submission',
      company: body.company ? sanitizeText(body.company, 100) : 'Not provided',
      phone: body.phone ? sanitizeText(body.phone, 20) : 'Not provided',
      service: body.service ? sanitizeText(body.service, 50) : 'General Inquiry',
    },
  };
};

/**
 * Check rate-limiting using Cloudflare KV
 * Limit: 5 submissions per IP per hour
 */
const checkRateLimit = async (kv, clientIp) => {
  if (!kv) {
    // If KV is not configured, allow the request but log a warning
    console.warn('RATE_LIMIT KV namespace not bound — skipping rate limit');
    return { allowed: true, remaining: 5 };
  }
  const key = `ratelimit:contact:${clientIp}`;
  const current = await kv.get(key, 'json') || { count: 0, timestamp: Date.now() };
  
  const oneHourAgo = Date.now() - 3600000;
  
  // Reset counter if outside 1-hour window
  if (current.timestamp < oneHourAgo) {
    await kv.put(key, JSON.stringify({ count: 1, timestamp: Date.now() }), { expirationTtl: 3600 });
    return { allowed: true, remaining: 4 };
  }

  // Check if limit exceeded
  if (current.count >= 5) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.timestamp + 3600000 - Date.now()) / 1000) };
  }

  // Increment counter
  current.count++;
  await kv.put(key, JSON.stringify(current), { expirationTtl: 3600 });
  
  return { allowed: true, remaining: 5 - current.count };
};

/**
 * Send emails via Web3Forms
 */
const sendViaWeb3Forms = async (data, web3FormsKey) => {
  const url = 'https://api.web3forms.com/submit';

  // Map our data to match Web3Forms expected format structure
  const payload = {
    access_key: web3FormsKey,
    subject: data.subject || 'New Contact Form Submission',
    from_name: 'TechGuru Automated System',
    name: data.name,
    email: data.email,
    message: data.message,
    // Using string interpolation for Web3Forms so it formats nicely in their default template
    'Company': data.company,
    'Phone': data.phone,
    'Service Interest': data.service
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
      console.error(`Web3Forms email failed (${response.status}):`, errorText);
      throw new Error(`Web3Forms failed: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Web3Forms Email Error:', error);
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
 * Main contact handler
 */
export const handleContact = async (request, env, ctx, origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();

    // Validate request
    const validation = validateContactRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check rate-limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(env.RATE_LIMIT, clientIp);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many submissions. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        }),
        { 
          status: 429, 
          headers: {
            ...corsHeaders,
            'Retry-After': rateLimit.retryAfter,
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

    // Send emails
    const result = await sendViaWeb3Forms(
      validation.data,
      web3FormsKey
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Failed to process submission. Please try again.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Send Telegram Notification
    ctx.waitUntil((async () => {
      const tgMessage = `🚀 <b>New TechGuru Lead!</b>\n\n` +
        `👤 <b>Name:</b> ${validation.data.name}\n` +
        `📧 <b>Email:</b> ${validation.data.email}\n` +
        `💼 <b>Service:</b> ${validation.data.service}\n` +
        `📞 <b>Phone:</b> ${validation.data.phone}\n` +
        `🏢 <b>Company:</b> ${validation.data.company}\n\n` +
        `💬 <b>Message:</b>\n<i>${validation.data.message}</i>`;
      
      await sendTelegramMessage(env, tgMessage);
    })());

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your inquiry! We will contact you soon.',
        remaining: rateLimit.remaining,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Contact Handler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: corsHeaders }
    );
  }
};
