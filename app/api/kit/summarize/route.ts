// app/api/kit/summarize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { isKitAllowed, getModel } from '@/lib/ai/kit-config';
import { SUMMARIZE_PROMPT } from '@/lib/ai/kit-prompts';
import { checkRateLimits, logUsage } from '@/lib/ai/kit-usage';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface SummarizeRequest {
  cardId: string;
  content?: string;  // Pre-extracted content (optional)
  title?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isKitAllowed(user.id)) {
      return NextResponse.json({ error: 'Kit is coming soon!' }, { status: 403 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimits(user.id, supabase);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }

    // Parse request
    const { cardId, content, title, url }: SummarizeRequest = await req.json();

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }

    // Get card from database if content not provided
    let cardContent = content;
    let cardTitle = title;
    let cardUrl = url;

    if (!cardContent) {
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('title, url, description, notes, content')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single();

      if (cardError || !card) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      }

      cardContent = card.content || card.description || card.notes || '';
      cardTitle = card.title;
      cardUrl = card.url;
    }

    if (!cardContent || cardContent.length < 50) {
      return NextResponse.json(
        { error: 'Not enough content to summarize. Try adding some notes!' },
        { status: 400 }
      );
    }

    // Build prompt
    const userMessage = `Title: ${cardTitle || 'Untitled'}
${cardUrl ? `URL: ${cardUrl}` : ''}

Content to summarize:
${cardContent.slice(0, 6000)}${cardContent.length > 6000 ? '\n\n[Content truncated...]' : ''}`;

    // Call API (always use fast model for summarize)
    const response = await anthropic.messages.create({
      model: getModel('fast'),
      max_tokens: 300,
      system: SUMMARIZE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const summary = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Log usage
    logUsage(user.id, supabase, {
      model: getModel('fast'),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      feature: 'summarize',
      requestSummary: `Summarized: ${cardTitle?.slice(0, 50)}`,
    }).catch(console.error);

    return NextResponse.json({
      summary,
      cardId,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    });

  } catch (error) {
    console.error('[Kit] Summarize error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
