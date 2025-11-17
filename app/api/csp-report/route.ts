import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/api-error';
import { success } from '@/lib/utils/api-responses';
import { rateLimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  // Add IP-based rate limiting (10 requests per minute per IP)
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const rateLimitResult = rateLimit({
    identifier: `csp-report:${ip}`,
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too many CSP reports',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter)
        }
      }
    );
  }

  try {
    const body = await request.json();

    // Validate CSP report structure
    const cspReport = body['csp-report'] || body;
    if (!cspReport || typeof cspReport !== 'object') {
      return NextResponse.json(
        { error: 'Invalid CSP report format' },
        { status: 400 }
      );
    }

    // Log the violation
    console.error('[CSP Violation]', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: ip,
      violation: cspReport,
    });

    // You can send this to a logging service like Sentry, LogRocket, etc.
    // Example:
    // await sendToLoggingService(body);

    return success({ received: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/csp-report' });
  }
}
