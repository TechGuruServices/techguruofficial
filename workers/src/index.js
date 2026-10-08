/**
 * Main Router for TechGuru API Workers
 * Routes: /api/chat, /api/contact, /api/subscribe, and /api/calendar/*
 */

import { handleCalendar } from './calendar.js';
import { handleChat } from './chat.js';
import { handleContact } from './contact.js';
import { handleSubscribe } from './subscribe.js';

/**
 * CORS headers with domain restriction
 */
const getCorsHeaders = (origin) => {
  const allowedOrigins = [
    'https://techguruofficial.us',
    'https://www.techguruofficial.us',
    'http://localhost:8000', // for local dev
    'http://127.0.0.1:8000', // for local dev
    'http://localhost:3000', // for local dev
    'http://localhost:5500', // VS Code Live Server
    'http://127.0.0.1:5500', // VS Code Live Server
    'http://localhost:5501', // VS Code Live Server alt
    'http://127.0.0.1:5501', // VS Code Live Server alt
    'http://localhost:5173', // Vite
    'http://localhost:4173', // Vite preview
  ];

  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://techguruofficial.us',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
};

/**
 * Main fetch handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || 'https://techguruofficial.us';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    // Route to appropriate handler
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'TechGuru API is running' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, ctx, origin);
    }

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env, ctx, origin);
    }

    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, ctx, origin);
    }

    // Calendar endpoints
    if (url.pathname.startsWith('/api/calendar')) {
      return handleCalendar(request, env, ctx, origin);
    }

    // 404 for unmatched routes
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  },
};
