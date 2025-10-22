import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[CSP Report] Failed to process report:', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}
