# TechGuru Cloudflare Workers Setup Guide

## Overview
This guide walks through deploying two serverless API endpoints:
- `/api/chat` - AI chat assistant powered by Groq (free tier)
- `/api/contact` - Contact form with email notifications via SendGrid

## Prerequisites
1. **Cloudflare Account** with `techguruofficial.us` domain (free tier works)
2. **Groq API Key** - FREE tier, no credit card (sign up at https://console.groq.com)
3. **SendGrid API Key** (free tier: 100 emails/day - sign up at https://sendgrid.com)
4. **Node.js** (v16+) and npm installed locally
5. **Wrangler CLI** (Cloudflare Worker tool)

---

## Step 1: Install Wrangler & Initialize

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare (opens browser)
wrangler login

# Navigate to workers directory
cd workers

# Install dependencies
npm install
```

---

## Step 2: Get Your API Keys

### Groq API Key (free)
1. Go to https://console.groq.com and create a free account (no credit card needed)
2. Go to API Keys and create a new key (starts with gsk_)
2. Click "API Keys" → "Create Key"
3. Copy the key (starts with `sk-ant-`)
4. Save it securely (never commit to repo)

### SendGrid API Key
1. Go to https://app.sendgrid.com
2. Settings → API Keys → Create API Key
3. Give it a meaningful name (e.g., "TechGuru Contact Forms")
4. Select "Mail Send" permissions
5. Copy the key
6. Save it securely

---

## Step 3: Create KV Namespace (Rate-Limiting)

**In Cloudflare Dashboard:**
1. Go to `Workers & Pages` → `KV`
2. Click "Create Namespace"
3. Name it `TECHGURU_RATE_LIMIT` (for production)
4. Also create a preview namespace: `TECHGURU_RATE_LIMIT_preview`

**Get the IDs:**
- Production ID: Click the namespace → copy "Namespace ID"
- Preview ID: Same process for preview namespace

**Update `wrangler.toml`:**
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-production-kv-id-here"
preview_id = "your-preview-kv-id-here"
```

---

## Step 4: Set Environment Secrets

These secrets are never exposed to the frontend. They are only accessible within your Worker code.

### Copy `.env.example` to `.env`
```bash
# In the workers/ directory
cp .env.example .env
```

Edit `.env` and fill in your actual values:
```bash
GROQ_API_KEY=gsk_your_groq_key_here   # Your Groq API key (free tier)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx   # Your SendGrid API key
ADMIN_EMAIL=lucas@techguruofficial.us      # Your email address
```

### Deploy Secrets to Cloudflare

```bash
# Set Groq API Key
wrangler secret put GROQ_API_KEY
# → When prompted, paste your Groq key (starts with gsk_)
# → Example: sk-ant-abc123def456ghi789jkl012

# Set SendGrid API Key
wrangler secret put SENDGRID_API_KEY
# → When prompted, paste your SendGrid key (starts with SG.)
# → Example: SG.abc123def456ghi789jkl012mno345

# Set Admin Email Address
wrangler secret put ADMIN_EMAIL
# → When prompted, type your email
# → Example: lucas@techguruofficial.us
```

**Verify all secrets are deployed:**
```bash
wrangler secret list
```

**Expected output:**
```
🔒 3 secrets

ADMIN_EMAIL (bound to 'env.ADMIN_EMAIL')
GROQ_API_KEY (bound to 'env.GROQ_API_KEY')
SENDGRID_API_KEY (bound to 'env.SENDGRID_API_KEY')
```

---

## ⚠️ CRITICAL: Do NOT commit `.env` file!

Add this to `.gitignore` (already included in this repo):
```bash
.env
.env.local
.env.*.local
node_modules/
```

---

## Step 5: Local Testing

```bash
# Start local development server
wrangler dev

# Test /api/chat endpoint
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services does TechGuru offer?"}'

# Expected response:
# {"reply":"TechGuru offers..."}

# Test /api/contact endpoint
curl -X POST http://localhost:8787/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "email":"john@example.com",
    "subject":"DevOps Consultation",
    "message":"I need help setting up CI/CD pipelines for my startup."
  }'

# Expected response:
# {"success":true,"message":"Thank you for your inquiry..."}
```

---

## Step 6: Deploy to Production

```bash
# Deploy workers to Cloudflare
wrangler deploy

# Verify deployment
# Visit: https://techguruofficial.us/api/chat (should show 404 for GET)
# Visit: https://techguruofficial.us/api/contact (should show 404 for GET)

# Test production endpoints
curl -X POST https://techguruofficial.us/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'
```

---

## Step 7: Configure Worker Routes in Cloudflare Dashboard

1. **Cloudflare Dashboard** → `Workers & Pages`
2. Click your worker (`techguru-api`)
3. Go to **Triggers** → **Routes**
4. Click "Add route"
5. Add routes:
   ```
   techguruofficial.us/api/*
   www.techguruofficial.us/api/*
   ```
6. Select zone: `techguruofficial.us`

---

## Step 8: Set Up WAF Rules (Rate-Limiting)

1. **Cloudflare Dashboard** → `Security` → `WAF`
2. Click "Create rule"
3. Rule name: `Rate-Limit Contact Form`
4. Condition: `Request URL Path contains /api/contact`
5. Action: `Rate Limit` → `10 requests per 60 seconds` (adjust as needed)
6. Deploy

---

## Step 9: Configure CORS

The workers already handle CORS, but if you need to adjust:

**In `src/index.js`, modify `getCorsHeaders()`:**
```javascript
const allowedOrigins = [
  'https://techguruofficial.us',
  'https://www.techguruofficial.us',
  // Add more domains if needed
];
```

---

## Step 10: Update Frontend API Calls

See `FRONTEND_INTEGRATION.md` for updating your HTML/JS to call these endpoints.

---

## Environment Variables Reference

| Variable | Value | Where to Set |
|----------|-------|--------------|
| `GROQ_API_KEY` | Your Groq API key (free tier) | Wrangler Secret |
| `SENDGRID_API_KEY` | Your SendGrid API key | Wrangler Secret |
| `NOTIFICATION_EMAIL` | lucas@techguruofficial.us | Wrangler Secret |
| `REPLY_TO_EMAIL` | info@techguruofficial.us | Wrangler Secret |
| `RATE_LIMIT` | KV namespace binding | wrangler.toml |

---

## Rate-Limiting Details

- **Contact Form**: 5 submissions per IP per hour
- **Chat**: 20 messages/IP/hour (Groq free tier — no billing)

To adjust: Edit `src/contact.js` → `checkRateLimit()` function.

---

## Troubleshooting

### "API authentication failed"
- ✅ Check Groq API key is correct
- ✅ Verify it's set: `wrangler secret list`

### "Email service is not properly configured"
- ✅ Check SendGrid API key is set
- ✅ Verify domain is verified in SendGrid dashboard

### "Too many submissions" error
- ✅ User hit rate limit (5 per hour per IP)
- ✅ Tell them to wait, check `retryAfter` in response

### CORS errors in browser console
- ✅ Verify your domain is in `allowedOrigins` in `src/index.js`
- ✅ Check Cloudflare worker routes are configured correctly

### "Request timed out"
- ✅ Claude API took >10 seconds (timeout set in `src/chat.js`)
- ✅ Try again, or increase timeout if needed

---

## Monitoring & Debugging

```bash
# View live worker logs
wrangler tail

# Deploy with debug logging enabled
wrangler deploy --env staging

# Check worker status in Cloudflare Dashboard
# Workers & Pages → your-worker → Deployments
```

---

## Cost Estimates (Monthly)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Cloudflare Workers** | 100k requests/day | Free* |
| **Groq (llama-3.3-70b)** | Free tier | $0 |
| **SendGrid Email** | 100/day | Free ($0/mo) |
| **KV Storage** | 1GB reads/day | Free* |

*Free tier is very generous for small projects.

---

## Next Steps

1. ✅ Deploy workers to production
2. ✅ Update frontend HTML to call `/api/chat` and `/api/contact`
3. ✅ Test end-to-end with real forms
4. ✅ Set up monitoring/alerts
5. ✅ Document any custom modifications

See `FRONTEND_INTEGRATION.md` for frontend integration steps.
