import { resolveCorsOrigin } from './cors.js';
/**
 * Calendar Endpoint Handler
 * Integrates with Cal.com API for booking and availability
 *
 * Environment variables required:
 * - CALCOM_API_KEY: Your Cal.com API key (stored as secret)
 */

const CALCOM_API_BASE = 'https://api.cal.com/v1';

/**
 * Get available time slots for a specific event type
 */
const getAvailability = async (apiKey, eventTypeId, startDate, endDate) => {
  const url = new URL(`${CALCOM_API_BASE}/availability`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('eventTypeId', eventTypeId);
  url.searchParams.set('startTime', startDate);
  url.searchParams.set('endTime', endDate);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cal.com API error (${response.status}):`, errorText);
      return { error: `Failed to fetch availability: ${response.status}` };
    }

    const data = await response.json();
    return { slots: data.slots || data };
  } catch (error) {
    console.error('Cal.com availability error:', error);
    return { error: 'Failed to connect to calendar service' };
  }
};

/**
 * Get list of event types
 */
const getEventTypes = async (apiKey) => {
  const url = `${CALCOM_API_BASE}/event-types?apiKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { error: `Failed to fetch event types: ${response.status}` };
    }

    const data = await response.json();
    return { eventTypes: data.event_types || data };
  } catch (error) {
    console.error('Cal.com event types error:', error);
    return { error: 'Failed to fetch event types' };
  }
};

/**
 * Create a booking
 */
const createBooking = async (apiKey, bookingData) => {
  const url = `${CALCOM_API_BASE}/bookings?apiKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cal.com booking error (${response.status}):`, errorText);
      return { error: `Failed to create booking: ${response.status}` };
    }

    const data = await response.json();
    return { booking: data };
  } catch (error) {
    console.error('Cal.com booking error:', error);
    return { error: 'Failed to create booking' };
  }
};

/**
 * Validate booking request
 */
const validateBookingRequest = (body) => {
  const required = ['eventTypeId', 'start', 'name', 'email'];

  for (const field of required) {
    if (!body[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email address' };
  }

  return { valid: true };
};

/**
 * Main calendar handler
 */
export const handleCalendar = async (request, env, ctx, origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const url = new URL(request.url);
  const apiKey = env.CALCOM_API_KEY;

  if (!apiKey) {
    console.error('CALCOM_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Calendar service is not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    // GET /api/calendar/availability - Get available slots
    if (request.method === 'GET' && url.pathname === '/api/calendar/availability' || url.pathname === '/api/calendar/unavailability') {
      const eventTypeId = url.searchParams.get('eventTypeId');
      const startDate = url.searchParams.get('startDate') || new Date().toISOString();
      const endDate = url.searchParams.get('endDate') ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days

      if (!eventTypeId) {
        return new Response(
          JSON.stringify({ error: 'eventTypeId is required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await getAvailability(apiKey, eventTypeId, startDate, endDate);

      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ slots: result.slots }),
        { status: 200, headers: corsHeaders }
      );
    }

    // GET /api/calendar/event-types - Get available event types
    if (request.method === 'GET' && url.pathname === '/api/calendar/event-types') {
      const result = await getEventTypes(apiKey);

      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ eventTypes: result.eventTypes }),
        { status: 200, headers: corsHeaders }
      );
    }

    // POST /api/calendar/book - Create a booking
    if (request.method === 'POST' && url.pathname === '/api/calendar/book') {
      const body = await request.json();

      const validation = validateBookingRequest(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: corsHeaders }
        );
      }

      const bookingData = {
        eventTypeId: parseInt(body.eventTypeId),
        start: body.start,
        responses: {
          name: body.name,
          email: body.email,
          notes: body.notes || '',
        },
        timeZone: body.timeZone || 'America/New_York',
        language: body.language || 'en',
        metadata: {},
      };

      const result = await createBooking(apiKey, bookingData);

      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Booking confirmed!',
          booking: result.booking
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid calendar endpoint' }),
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Calendar Handler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: corsHeaders }
    );
  }
};
