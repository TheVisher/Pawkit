import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/api-error';
import { success } from '@/lib/utils/api-responses';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log CSP violations to console in production
    console.error('[CSP Violation]', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      violation: body['csp-report'] || body,
    });

    // You can send this to a logging service like Sentry, LogRocket, etc.
    // Example:
    // await sendToLoggingService(body);

    return success({ received: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/csp-report' });
  }
}
