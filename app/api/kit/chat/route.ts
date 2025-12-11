// app/api/kit/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { KIT_CONFIG, isKitAllowed, getModel, estimateTokens } from '@/lib/ai/kit-config';
import { KIT_SYSTEM_PROMPT } from '@/lib/ai/kit-prompts';
import { buildKitContext } from '@/lib/ai/kit-context';
import { checkRateLimits, logUsage } from '@/lib/ai/kit-usage';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  cardContext?: {
    id: string;
    title: string;
    url?: string;
    description?: string;
    content?: string;
    notes?: string;
    tags?: string[];
  };
  viewContext?: 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';
  pawkitSlug?: string; // When viewContext is 'pawkit', this is the current pawkit
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to chat with Kit' },
        { status: 401 }
      );
    }

    // 2. Check Kit access (whitelist)
    if (!isKitAllowed(user.id)) {
      return NextResponse.json(
        { error: 'Kit is coming soon! 🐕 Stay tuned.' },
        { status: 403 }
      );
    }

    // 3. Check rate limits
    const rateLimitResult = await checkRateLimits(user.id, supabase);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429 }
      );
    }

    // 4. Parse and validate request
    const body: ChatRequest = await req.json();
    const { message, conversationHistory = [], cardContext, viewContext, pawkitSlug } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long. Please keep it under 5000 characters.' },
        { status: 400 }
      );
    }

    // 5. Build context from user's Pawkit data
    const context = await buildKitContext(user.id, message, supabase, cardContext, viewContext, pawkitSlug);

    // 6. Determine model based on complexity
    // Use smart model for: long messages, long conversations, or explicit request
    const useSmartModel =
      message.length > 500 ||
      conversationHistory.length > 4 ||
      message.toLowerCase().includes('analyze') ||
      message.toLowerCase().includes('explain in detail');

    const model = getModel(useSmartModel ? 'smart' : 'fast');

    // 7. Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.slice(-10).map(msg => ({ // Keep last 10 messages
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // 8. Check total input size
    const systemWithContext = `${KIT_SYSTEM_PROMPT}\n\n---\n\n${context}`;
    const totalInput = systemWithContext + messages.map(m => m.content).join('');
    const estimatedInputTokens = estimateTokens(totalInput);

    if (estimatedInputTokens > KIT_CONFIG.limits.maxInputTokens) {
      return NextResponse.json(
        { error: 'Request too large. Try asking about fewer items or starting a new conversation.' },
        { status: 400 }
      );
    }

    // 9. Call Anthropic API
    const response = await anthropic.messages.create({
      model,
      max_tokens: KIT_CONFIG.limits.maxOutputTokens,
      system: systemWithContext,
      messages,
    });

    // 10. Extract response text
    const assistantMessage = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // 11. Log usage (async, don't await)
    logUsage(user.id, supabase, {
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      feature: 'chat',
      requestSummary: message.slice(0, 100),
    }).catch(err => console.error('[Kit] Usage log error:', err));

    // 12. Return response
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      message: assistantMessage,
      model: model.includes('haiku') ? 'fast' : 'smart',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      remaining: rateLimitResult.remaining,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    console.error('[Kit] Chat error:', error);

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Kit is a bit overwhelmed right now. Please try again in a moment.' },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        console.error('[Kit] Invalid API key');
        return NextResponse.json(
          { error: 'Kit is having technical difficulties. Please try again later.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Kit encountered an error. Please try again.' },
      { status: 500 }
    );
  }
}
