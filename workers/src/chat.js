import { resolveCorsOrigin } from './cors.js';
/**
 * Chat Endpoint Handler
 * Proxies requests to Groq API (free tier)
 *
 * Environment variables required:
 * - GROQ_API_KEY: Your Groq API key (free tier at https://console.groq.com)
 */

/**
 * Check rate-limiting using Cloudflare KV
 * Limit: 20 chat messages per IP per hour (each call costs API money)
 */
const checkRateLimit = async (kv, clientIp) => {
  if (!kv) {
    // If KV is not configured, allow the request but log a warning
    console.warn('RATE_LIMIT KV namespace not bound — skipping chat rate limit');
    return { allowed: true, remaining: 20 };
  }
  const key = `ratelimit:chat:${clientIp}`;
  const current = await kv.get(key, 'json') || { count: 0, timestamp: Date.now() };

  const oneHourAgo = Date.now() - 3600000;

  // Reset counter if outside 1-hour window
  if (current.timestamp < oneHourAgo) {
    await kv.put(key, JSON.stringify({ count: 1, timestamp: Date.now() }), { expirationTtl: 3600 });
    return { allowed: true, remaining: 19 };
  }

  // Check if limit exceeded
  if (current.count >= 20) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, JSON.stringify({ count: current.count + 1, timestamp: current.timestamp }), { expirationTtl: 3600 });
  return { allowed: true, remaining: 20 - current.count - 1 };
};

const getClientIp = (request) => {
  return request.headers.get('CF-Connecting-IP')
    || (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim()
    || 'unknown';
};

/**
 * Comprehensive input sanitization for security
 * - Removes HTML/script tags
 * - Removes potential SQL injection patterns
 * - Removes null bytes and control characters
 * - Normalizes whitespace
 * - Limits length
 */
const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';

  let sanitized = text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content (extra protection)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove potential XSS event handlers
    .replace(/on\w+\s*=\s*(['"]?).*?\1/gi, '')
    // Remove javascript: and data: URLs
    .replace(/(?:javascript|data|vbscript):/gi, '')
    // Remove null bytes and control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove potential SQL injection patterns (basic protection)
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();

  // Limit to max 5000 characters
  return sanitized.slice(0, 5000);
};

/**
 * Validate and sanitize request payload
 */
const validateChatRequest = (body) => {
  // Check body exists
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  // Check message exists
  if (!body.message) {
    return { valid: false, error: 'Message is required' };
  }

  // Check message is a string
  if (typeof body.message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }

  const message = sanitizeInput(body.message);

  if (message.length < 1) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (message.length > 5000) {
    return { valid: false, error: 'Message exceeds 5000 character limit' };
  }

  // Check for suspicious patterns that might indicate abuse
  const suspiciousPatterns = [
    /\{[\s\S]*\}[\s\S]*\{/,  // Multiple JSON-like objects (potential prompt injection)
    /(system|assistant|user):\s*\n/i,  // Potential role injection
    /ignore (previous|all|above) instructions/i,  // Common prompt injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      console.warn('Suspicious pattern detected in message');
      // Don't reject, but log for monitoring
    }
  }

  return { valid: true, message };
};

/**
 * TechGuru AI System Prompt
 */
const SYSTEM_PROMPT = `You are the TechGuru AI Assistant. Be concise, professional, and helpful.

CRITICAL RESPONSE LIMITS:
- Keep ALL responses under 100 words maximum
- Answers should be 2-4 sentences or 3-5 bullet points
- No rambling or repetition
- Direct and actionable always

COMPANY INFO:
TechGuru, founded by Lucas Thompson, delivers enterprise-grade DevOps, AI & cloud automation for startups and solo founders. We create scalable, efficient solutions that grow with your business—without the enterprise price tag.

SERVICES & PRICING:

1. AI Assistants & Automation Systems
- Lite Build: $1,500–$2,500
- Pro Automations: $3,500–$7,000
- Enterprise Multi-Agent: $8,000–$15,000

2. Operations & Workflow Engineering
- Audit Only: $1,000–$1,800
- Workflow Redesign: $2,500–$5,500
- Full Overhaul: $6,000–$10,500

3. Knowledge, SOP & Playbook Systems
- SOP Starter: $1,200–$1,800
- Full Playbook System: $2,800–$5,000
- Enterprise Knowledge Base: $5,500–$9,000

4. Custom Micro-Tools & Internal Utilities
- Simple Micro-App: $1,500–$2,500
- Advanced Tool: $3,500–$6,000
- Full Internal Suite: $7,000–$12,000

5. Strategic Technology & Product Consulting
- Hourly Consulting: $125–$250/hr
- Tech Strategy Blueprint: $1,500–$3,000
- Full System Roadmap: $3,000–$6,000

Plus: Custom Projects tailored to your needs.

YOUR ROLE:
- Discover what visitors need and their business context
- Recommend services that match their situation
- Share relevant pricing ranges
- Guide them to contact form for proposals
- Be transparent: you are an AI assistant, not human staff

DO:
- Ask 1-2 focused discovery questions per reply
- Provide brief, high-level guidance
- Reference service tiers by name when relevant
- Mention pricing ranges to set expectations
- Suggest contacting for custom solutions

DON'T:
- Promise specific outcomes, timelines, or guarantees
- Give legal/financial/tax advice
- Ask for passwords, API keys, or sensitive data
- Claim to be TechGuru staff
- Give away full implementations

TONE: Professional, confident, solution-oriented. Plain text only—no markdown, emojis, asterisks, or special formatting.`;

/**
 * Call Groq API (OpenAI-compatible, free tier)
 * Model: openai/gpt-oss-120b — strong quality, generous free limits
 */
const callGroqAPI = async (message, apiKey) => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: 'openai/gpt-oss-120b',
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: message,
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API HTTP Status:', response.status);
      console.error('Groq API Raw Response:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        return { error: `API error (${response.status}): ${errorText}` };
      }

      console.error('Groq API Error Response:', JSON.stringify(errorData));

      if (response.status === 401) {
        return { error: 'API authentication failed. Please check your API key.' };
      }

      // Handle different error formats (OpenAI-compatible)
      const errorMessage = errorData.error?.message ||
        errorData.message ||
        JSON.stringify(errorData.error) ||
        JSON.stringify(errorData) ||
        'Failed to get response from AI service';

      return { error: String(errorMessage) };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'No response generated';

    return { reply };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }

    console.error('Chat API Error:', error);
    return { error: 'An error occurred while processing your message. Please try again.' };
  }
};

/**
 * Main chat handler
 */
export const handleChat = async (request, env, ctx, origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();

    // Validate input
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting — chat calls cost API money
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(env.RATE_LIMIT, clientIp);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many messages. Please try again in an hour.' }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Check for API key
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service is not properly configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Call Claude API
    const result = await callGroqAPI(validation.message, apiKey);

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 503, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ reply: result.reply }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Chat Handler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: corsHeaders }
    );
  }
};
