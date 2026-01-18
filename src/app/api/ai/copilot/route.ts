import { NextResponse } from 'next/server';

/**
 * AI Copilot Route - Currently Disabled
 *
 * AI features are disabled until API keys are configured.
 * To enable, configure AI_GATEWAY_API_KEY.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'AI features are not configured. Please configure AI_GATEWAY_API_KEY to enable.' },
    { status: 501 }
  );
}
