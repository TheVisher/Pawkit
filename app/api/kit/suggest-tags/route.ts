// app/api/kit/suggest-tags/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { isKitAllowed, getModel } from '@/lib/ai/kit-config';
import { SUGGEST_TAGS_PROMPT } from '@/lib/ai/kit-prompts';
import { checkRateLimits, logUsage } from '@/lib/ai/kit-usage';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface SuggestTagsRequest {
  cardId?: string;
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isKitAllowed(user.id)) {
      return NextResponse.json({ error: 'Kit is coming soon!' }, { status: 403 });
    }

    const rateLimitResult = await checkRateLimits(user.id, supabase);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }

    const body: SuggestTagsRequest = await req.json();
    let { cardId, title, url, description, content } = body;

    // Fetch card data if cardId provided
    if (cardId && !title) {
      const { data: card } = await supabase
        .from('cards')
        .select('title, url, description, content, domain')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single();

      if (card) {
        title = card.title;
        url = card.url;
        description = card.description;
        content = card.content;
      }
    }

    if (!title && !url && !description && !content) {
      return NextResponse.json(
        { error: 'Need some content to suggest tags' },
        { status: 400 }
      );
    }

    // Get existing user tags for context
    const { data: existingTags } = await supabase
      .from('cards')
      .select('tags')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .not('tags', 'is', null);

    // Flatten and dedupe existing tags
    const userTags = [...new Set(
      existingTags?.flatMap(c => c.tags || []) || []
    )].slice(0, 50);

    // Build prompt
    const userMessage = `Content to tag:
Title: ${title || 'Untitled'}
${url ? `URL: ${url}` : ''}
${description ? `Description: ${description}` : ''}
${content ? `Content preview: ${content.slice(0, 1000)}` : ''}

User's existing tags for reference (prefer these if relevant):
${userTags.length > 0 ? userTags.join(', ') : 'No existing tags yet'}`;

    const response = await anthropic.messages.create({
      model: getModel('fast'),
      max_tokens: 100,
      system: SUGGEST_TAGS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON array from response
    let suggestedTags: string[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestedTags = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, try to extract tags manually
      suggestedTags = responseText
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0 && t.length < 30);
    }

    // Ensure we have valid tags
    suggestedTags = suggestedTags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0 && tag.length < 30)
      .slice(0, 5);

    // Log usage
    logUsage(user.id, supabase, {
      model: getModel('fast'),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      feature: 'suggest-tags',
      requestSummary: `Tags for: ${title?.slice(0, 50)}`,
    }).catch(console.error);

    return NextResponse.json({
      suggestedTags,
      cardId,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    });

  } catch (error) {
    console.error('[Kit] Suggest tags error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest tags' },
      { status: 500 }
    );
  }
}
