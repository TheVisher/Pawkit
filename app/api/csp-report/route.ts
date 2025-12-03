import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/api-error';
import { success, rateLimited } from '@/lib/utils/api-responses';
import { rateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP to prevent DoS via report flooding
    // CSP reports come from browsers, so we use forwarded IP or connection IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    const rateLimitResult = rateLimit({
      identifier: `csp-report:${ip}`,
      limit: 20,        // 20 reports
      windowMs: 60000,  // per minute
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return rateLimited('Too many CSP reports. Rate limited.');
    }

    const body = await request.json();

    // Log CSP violations (always log these even in production)
    logger.error('[CSP Violation]', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      violation: body['csp-report'] || body,
    });

    // You can send this to a logging service like Sentry, LogRocket, etc.
    // Example:
    // await sendToLoggingService(body);

    const response = success({ received: true });
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error, { route: '/api/csp-report' });
  }
}
