# Kit AI Implementation Plan

> **Purpose**: Implementation guide for adding Kit (AI assistant) to Pawkit
> **Created**: December 10, 2025
> **Status**: Ready for implementation
> **Estimated Time**: 4-6 hours total

---

## Overview

Kit is Pawkit's AI assistant - a friendly dog-themed helper that uses Claude's API under the hood but presents as "Kit" to users. This plan covers the complete implementation with safety rails, cost protection, and a dev-only testing phase.

### Key Principles

1. **Cost Protection First**: Haiku model by default, strict rate limits, usage tracking
2. **Dev-Only Initially**: Only your user ID can access Kit until proven stable
3. **Kit Branding**: Users see "Kit", not "Claude" - but can know it's powered by Claude
4. **Incremental Features**: Start with chat, add summarize/tags later

---

## Task Breakdown (Parallelizable)

These tasks can be run as separate Claude Code agents and merged:

| Task ID | Task Name | Dependencies | Est. Time |
|---------|-----------|--------------|-----------|
| **T1** | Database Setup | None | 15 min |
| **T2** | Core AI Library | None | 45 min |
| **T3** | Chat API Route | T2 | 30 min |
| **T4** | Summarize API Route | T2 | 20 min |
| **T5** | Suggest Tags API Route | T2 | 20 min |
| **T6** | Kit Chat UI Component | T3 | 1 hour |
| **T7** | Integration & Testing | T1-T6 | 1 hour |

**Parallel Execution Strategy**:
- **Wave 1**: T1, T2 (no dependencies)
- **Wave 2**: T3, T4, T5 (all depend on T2)
- **Wave 3**: T6 (depends on T3)
- **Wave 4**: T7 (integration)

---

## Task T1: Database Setup

### Objective
Create Supabase table for tracking Kit usage and rate limiting.

### Instructions

Run this SQL in Supabase SQL Editor:

```sql
-- Kit usage tracking table
CREATE TABLE IF NOT EXISTS kit_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_cents NUMERIC(10, 4) NOT NULL,
  feature TEXT NOT NULL,
  request_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for rate limiting queries (user + time)
CREATE INDEX kit_usage_user_created_idx ON kit_usage(user_id, created_at DESC);

-- Index for cost analysis
CREATE INDEX kit_usage_feature_idx ON kit_usage(feature, created_at DESC);

-- RLS policies
ALTER TABLE kit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON kit_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON kit_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE kit_usage IS 'Tracks Kit AI assistant usage for rate limiting and cost monitoring';
```

### Verification
- [ ] Table created successfully
- [ ] Indexes created
- [ ] RLS policies active
- [ ] Can insert test row and query it

---

## Task T2: Core AI Library

### Objective
Create the foundational AI library files with config, prompts, context building, and usage tracking.

### Step 1: Install Anthropic SDK

```bash
pnpm add @anthropic-ai/sdk
```

### Step 2: Create lib/ai/kit-config.ts

```typescript
// lib/ai/kit-config.ts

/**
 * Kit AI Configuration
 * 
 * Controls feature flags, model selection, rate limits, and access control.
 * IMPORTANT: Only allowedUserIds can access Kit until public release.
 */

export const KIT_CONFIG = {
  // Master feature flag
  enabled: process.env.NEXT_PUBLIC_KIT_ENABLED === 'true',
  
  // User whitelist - ONLY these user IDs can access Kit
  // Get your user ID from Supabase: SELECT id FROM auth.users WHERE email = 'your@email.com'
  allowedUserIds: process.env.KIT_ALLOWED_USER_ID 
    ? [process.env.KIT_ALLOWED_USER_ID]
    : [],
  
  // Model configuration
  // Haiku: Fast, cheap ($0.25/1M input, $1.25/1M output)
  // Sonnet: Smarter, more expensive ($3/1M input, $15/1M output)
  models: {
    fast: 'claude-haiku-4-5-20251001',
    smart: 'claude-sonnet-4-5-20250929',
  } as const,
  
  // Cost protection limits
  limits: {
    // Token limits per request
    maxInputTokens: 8000,
    maxOutputTokens: 1000,
    
    // Rate limits
    requestsPerHour: 20,
    requestsPerDay: 100,
    
    // Budget cap (in cents) - $20/month default
    monthlyBudgetCents: 2000,
  },
  
  // Feature toggles
  features: {
    chat: true,           // Kit chat interface
    summarize: true,      // Summarize cards on demand
    suggestTags: true,    // Suggest tags for cards
    findSimilar: true,    // Find similar cards
    // Future features (disabled)
    autoTagOnSave: false, // Auto-tag new cards
    topicNotes: false,    // Generate topic notes
  },
} as const;

/**
 * Check if a user is allowed to use Kit
 */
export function isKitAllowed(userId: string): boolean {
  if (!KIT_CONFIG.enabled) return false;
  if (KIT_CONFIG.allowedUserIds.length === 0) return false;
  return KIT_CONFIG.allowedUserIds.includes(userId);
}

/**
 * Get the appropriate model based on task complexity
 */
export function getModel(complexity: 'fast' | 'smart' = 'fast'): string {
  return KIT_CONFIG.models[complexity];
}

/**
 * Estimate token count (rough approximation)
 * ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Step 3: Create lib/ai/kit-prompts.ts

```typescript
// lib/ai/kit-prompts.ts

/**
 * Kit AI Prompts
 * 
 * Defines Kit's personality and task-specific prompts.
 * Kit is Pawkit's friendly AI assistant with a dog theme.
 */

export const KIT_SYSTEM_PROMPT = `You are Kit, the AI assistant built into Pawkit - a privacy-focused bookmark and knowledge manager.

## Your Personality
- Friendly, helpful, and slightly playful (like a loyal dog eager to help)
- Concise - users are busy, get to the point quickly
- Occasionally use dog-related expressions naturally, not forced ("Let me dig that up!", "Found it!", "I'll fetch that for you")
- Genuinely enthusiastic about helping users organize their digital life

## Your Capabilities
- Search and find items in the user's Pawkit library
- Summarize articles, videos, and notes they've saved
- Suggest tags and organization strategies
- Answer questions about their saved content
- Help users rediscover forgotten bookmarks
- Explain what saved content is about

## Your Limitations (be honest about these)
- You can only see content the user has saved to Pawkit
- You cannot browse the web or access URLs directly
- You cannot modify the user's library directly (only suggest changes)
- For large reorganization tasks, you can suggest they use Claude Desktop with Pawkit MCP

## Response Style
- Keep responses under 150 words unless the user asks for detail
- Use markdown sparingly - bold for emphasis, lists only when truly helpful
- Never use headers in conversational responses
- When you find relevant saved items, mention 1-3 specifically by title
- If you can't find something, say so honestly

## Critical Rules
- NEVER mention Claude, Anthropic, or being a language model
- You ARE Kit, you are part of Pawkit
- If asked who made you: "I'm built into Pawkit by Erik"
- If asked what AI you use: "I'm Kit! I use some smart tech under the hood to help you out"
- Stay focused on helping with Pawkit - don't go off on tangents`;

export const SUMMARIZE_PROMPT = `Summarize this content concisely for someone who saved it to read later.

Focus on:
- Main points and key arguments
- Important takeaways or action items
- Why this content might be valuable

Guidelines:
- Keep it under 100 words
- No headers or excessive formatting
- Write in a friendly, accessible tone
- If it's a video, note key timestamps if apparent from the content`;

export const SUGGEST_TAGS_PROMPT = `Based on this content, suggest 3-5 relevant tags for organizing it.

Guidelines:
- Tags should be lowercase, single words or short phrases
- Focus on: topic, content type, domain/field, action (to-read, reference, tutorial)
- Be specific enough to be useful but general enough to group similar items

Return ONLY a JSON array of tag strings, nothing else.
Example: ["javascript", "tutorial", "web-dev", "react"]`;

export const FIND_SIMILAR_PROMPT = `Based on the user's query and their saved content, identify which items are most relevant.

Consider:
- Direct topic matches
- Related themes or concepts  
- Same domain or source
- Similar content types

Return your findings in a natural, conversational way. Mention specific titles.`;

export const EXPLAIN_CONTENT_PROMPT = `Explain what this saved content is about in simple terms.

The user saved this but might not remember why or what it contains.

Guidelines:
- Start with a one-sentence summary
- Explain the main topic and why it might be useful
- Keep it under 75 words
- Be friendly and helpful`;
```

### Step 4: Create lib/ai/kit-context.ts

```typescript
// lib/ai/kit-context.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { estimateTokens, KIT_CONFIG } from './kit-config';

/**
 * Context for Kit to understand what the user is asking about
 */
interface CardContext {
  id: string;
  title: string;
  url?: string;
  description?: string;
  content?: string;  // Extracted article content
  notes?: string;    // User's notes
  tags?: string[];
}

/**
 * Build context from user's Pawkit data for Kit to reference
 * 
 * This fetches relevant data from Supabase to give Kit context about:
 * - The specific card being discussed (if any)
 * - User's Pawkits (collections)
 * - Cards that might be relevant to the query
 * - Recently saved items
 */
export async function buildKitContext(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  cardContext?: CardContext
): Promise<string> {
  const contextParts: string[] = [];
  let totalTokens = 0;
  const maxContextTokens = KIT_CONFIG.limits.maxInputTokens - 2000; // Reserve for system prompt + response
  
  // 1. Add specific card context if provided
  if (cardContext) {
    let cardSection = `## Current Card\n`;
    cardSection += `**Title**: ${cardContext.title}\n`;
    if (cardContext.url) cardSection += `**URL**: ${cardContext.url}\n`;
    if (cardContext.description) cardSection += `**Description**: ${cardContext.description}\n`;
    if (cardContext.tags?.length) cardSection += `**Tags**: ${cardContext.tags.join(', ')}\n`;
    if (cardContext.notes) cardSection += `**User Notes**: ${cardContext.notes}\n`;
    if (cardContext.content) {
      // Truncate content to fit token budget
      const contentLimit = 4000;
      const truncatedContent = cardContext.content.length > contentLimit
        ? cardContext.content.slice(0, contentLimit) + '...[truncated]'
        : cardContext.content;
      cardSection += `**Content**:\n${truncatedContent}\n`;
    }
    
    const sectionTokens = estimateTokens(cardSection);
    if (totalTokens + sectionTokens < maxContextTokens) {
      contextParts.push(cardSection);
      totalTokens += sectionTokens;
    }
  }
  
  // 2. Get user's Pawkits (collections) for context
  const { data: pawkits } = await supabase
    .from('collections')
    .select('name, slug, description')
    .eq('user_id', userId)
    .eq('deleted', false)
    .order('name')
    .limit(30);
  
  if (pawkits?.length) {
    let pawkitSection = `## User's Pawkits (${pawkits.length} collections)\n`;
    pawkitSection += pawkits.map(p => `- ${p.name}${p.description ? `: ${p.description}` : ''}`).join('\n');
    
    const sectionTokens = estimateTokens(pawkitSection);
    if (totalTokens + sectionTokens < maxContextTokens) {
      contextParts.push(pawkitSection);
      totalTokens += sectionTokens;
    }
  }
  
  // 3. Search for relevant cards based on query
  const keywords = extractKeywords(query);
  if (keywords.length > 0 && totalTokens < maxContextTokens - 1000) {
    // Build search pattern
    const searchPattern = keywords.map(k => `%${k}%`).join('%');
    
    const { data: relevantCards } = await supabase
      .from('cards')
      .select('id, title, description, url, domain, tags')
      .eq('user_id', userId)
      .eq('deleted', false)
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(10);
    
    if (relevantCards?.length) {
      let relevantSection = `## Potentially Relevant Saved Items\n`;
      for (const card of relevantCards) {
        relevantSection += `- **${card.title}**`;
        if (card.domain) relevantSection += ` (${card.domain})`;
        if (card.tags?.length) relevantSection += ` [${card.tags.slice(0, 3).join(', ')}]`;
        relevantSection += '\n';
        if (card.description) {
          relevantSection += `  ${card.description.slice(0, 100)}${card.description.length > 100 ? '...' : ''}\n`;
        }
      }
      
      const sectionTokens = estimateTokens(relevantSection);
      if (totalTokens + sectionTokens < maxContextTokens) {
        contextParts.push(relevantSection);
        totalTokens += sectionTokens;
      }
    }
  }
  
  // 4. Add recent cards for general context
  if (totalTokens < maxContextTokens - 500) {
    const { data: recentCards } = await supabase
      .from('cards')
      .select('title, domain, tags')
      .eq('user_id', userId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentCards?.length) {
      let recentSection = `## Recently Saved\n`;
      for (const card of recentCards) {
        recentSection += `- ${card.title}`;
        if (card.domain) recentSection += ` (${card.domain})`;
        recentSection += '\n';
      }
      
      const sectionTokens = estimateTokens(recentSection);
      if (totalTokens + sectionTokens < maxContextTokens) {
        contextParts.push(recentSection);
      }
    }
  }
  
  return contextParts.length > 0 
    ? contextParts.join('\n\n')
    : 'User has no saved items yet.';
}

/**
 * Extract meaningful keywords from a query
 * Filters out common words and short words
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
    'find', 'show', 'get', 'give', 'tell', 'help', 'want', 'need', 'please',
    'my', 'me', 'any', 'saved', 'bookmark', 'bookmarks', 'card', 'cards'
  ]);
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5); // Max 5 keywords
}
```

### Step 5: Create lib/ai/kit-usage.ts

```typescript
// lib/ai/kit-usage.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { KIT_CONFIG } from './kit-config';

interface UsageLog {
  model: string;
  inputTokens: number;
  outputTokens: number;
  feature: string;
  requestSummary?: string;
}

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  remaining?: {
    hourly: number;
    daily: number;
  };
}

/**
 * Check if user is within rate limits
 */
export async function checkRateLimits(
  userId: string,
  supabase: SupabaseClient
): Promise<RateLimitResult> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Check hourly limit
  const { count: hourlyCount, error: hourlyError } = await supabase
    .from('kit_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', hourAgo.toISOString());
  
  if (hourlyError) {
    console.error('[Kit] Rate limit check error:', hourlyError);
    // Allow on error to not block users due to DB issues
    return { allowed: true };
  }
  
  const hourlyUsed = hourlyCount || 0;
  if (hourlyUsed >= KIT_CONFIG.limits.requestsPerHour) {
    return {
      allowed: false,
      message: "Whoa there! Kit needs a short break. Try again in an hour! 🐕",
      remaining: { hourly: 0, daily: KIT_CONFIG.limits.requestsPerDay - hourlyUsed }
    };
  }
  
  // Check daily limit
  const { count: dailyCount, error: dailyError } = await supabase
    .from('kit_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayAgo.toISOString());
  
  if (dailyError) {
    console.error('[Kit] Daily rate limit check error:', dailyError);
    return { allowed: true };
  }
  
  const dailyUsed = dailyCount || 0;
  if (dailyUsed >= KIT_CONFIG.limits.requestsPerDay) {
    return {
      allowed: false,
      message: "Kit has been a busy helper today! Let's continue tomorrow. 🐕💤",
      remaining: { hourly: 0, daily: 0 }
    };
  }
  
  return {
    allowed: true,
    remaining: {
      hourly: KIT_CONFIG.limits.requestsPerHour - hourlyUsed,
      daily: KIT_CONFIG.limits.requestsPerDay - dailyUsed
    }
  };
}

/**
 * Log usage to database for tracking and billing analysis
 */
export async function logUsage(
  userId: string,
  supabase: SupabaseClient,
  usage: UsageLog
): Promise<void> {
  // Calculate estimated cost
  const isHaiku = usage.model.includes('haiku');
  
  // Haiku: $0.25/1M input, $1.25/1M output
  // Sonnet: $3/1M input, $15/1M output
  const inputCostPerToken = isHaiku ? 0.00000025 : 0.000003;
  const outputCostPerToken = isHaiku ? 0.00000125 : 0.000015;
  
  const inputCost = usage.inputTokens * inputCostPerToken;
  const outputCost = usage.outputTokens * outputCostPerToken;
  const totalCostCents = (inputCost + outputCost) * 100;
  
  const { error } = await supabase.from('kit_usage').insert({
    user_id: userId,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_cents: totalCostCents,
    feature: usage.feature,
    request_summary: usage.requestSummary?.slice(0, 200), // Truncate summary
  });
  
  if (error) {
    console.error('[Kit] Failed to log usage:', error);
    // Don't throw - logging failure shouldn't break the feature
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  today: { requests: number; costCents: number };
  thisMonth: { requests: number; costCents: number };
  byFeature: Record<string, number>;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Today's usage
  const { data: todayData } = await supabase
    .from('kit_usage')
    .select('estimated_cost_cents')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString());
  
  // This month's usage
  const { data: monthData } = await supabase
    .from('kit_usage')
    .select('estimated_cost_cents, feature')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());
  
  // Aggregate by feature
  const byFeature: Record<string, number> = {};
  monthData?.forEach(row => {
    byFeature[row.feature] = (byFeature[row.feature] || 0) + 1;
  });
  
  return {
    today: {
      requests: todayData?.length || 0,
      costCents: todayData?.reduce((sum, r) => sum + Number(r.estimated_cost_cents), 0) || 0
    },
    thisMonth: {
      requests: monthData?.length || 0,
      costCents: monthData?.reduce((sum, r) => sum + Number(r.estimated_cost_cents), 0) || 0
    },
    byFeature
  };
}
```

### Verification for T2
- [ ] pnpm add @anthropic-ai/sdk completed
- [ ] lib/ai/kit-config.ts created and exports correctly
- [ ] lib/ai/kit-prompts.ts created with all prompts
- [ ] lib/ai/kit-context.ts created and builds context
- [ ] lib/ai/kit-usage.ts created with rate limiting
- [ ] No TypeScript errors

---

## Task T3: Chat API Route

### Objective
Create the main chat endpoint at `/api/kit/chat`

### Create app/api/kit/chat/route.ts

```typescript
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
    const { message, conversationHistory = [], cardContext } = body;
    
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
    const context = await buildKitContext(user.id, message, supabase, cardContext);
    
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
```

### Verification for T3
- [ ] Route created at app/api/kit/chat/route.ts
- [ ] Auth check works (returns 401 for unauthenticated)
- [ ] Whitelist check works (returns 403 for non-whitelisted users)
- [ ] Rate limiting works
- [ ] Can successfully chat with Kit
- [ ] Usage is logged to database

---

## Task T4: Summarize API Route

### Objective
Create endpoint to summarize a specific card's content

### Create app/api/kit/summarize/route.ts

```typescript
// app/api/kit/summarize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { KIT_CONFIG, isKitAllowed, getModel } from '@/lib/ai/kit-config';
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
```

### Verification for T4
- [ ] Route created at app/api/kit/summarize/route.ts
- [ ] Can summarize a card by ID
- [ ] Handles missing content gracefully
- [ ] Usage is logged

---

## Task T5: Suggest Tags API Route

### Objective
Create endpoint to suggest tags for a card

### Create app/api/kit/suggest-tags/route.ts

```typescript
// app/api/kit/suggest-tags/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { KIT_CONFIG, isKitAllowed, getModel } from '@/lib/ai/kit-config';
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
    } catch (parseError) {
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
```

### Verification for T5
- [ ] Route created at app/api/kit/suggest-tags/route.ts
- [ ] Returns array of suggested tags
- [ ] Considers user's existing tags
- [ ] Usage is logged

---

## Task T6: Kit Chat UI Component

### Objective
Create the Kit chat panel UI that integrates with the existing control panel system.

### Step 1: Create hooks/use-kit-store.ts

```typescript
// hooks/use-kit-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface KitState {
  // Chat state
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Current context (card being discussed)
  activeCardContext: {
    id: string;
    title: string;
    content?: string;
  } | null;
  
  // Actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveCardContext: (card: KitState['activeCardContext']) => void;
  
  // API call
  sendMessage: (message: string) => Promise<void>;
}

export const useKitStore = create<KitState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      activeCardContext: null,
      
      addMessage: (role, content) => {
        const message: Message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          content,
          timestamp: new Date(),
        };
        set(state => ({
          messages: [...state.messages, message],
          error: null,
        }));
      },
      
      clearMessages: () => set({ messages: [], error: null }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setActiveCardContext: (card) => set({ activeCardContext: card }),
      
      sendMessage: async (message: string) => {
        const { messages, activeCardContext, addMessage, setLoading, setError } = get();
        
        // Add user message immediately
        addMessage('user', message);
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch('/api/kit/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })),
              cardContext: activeCardContext,
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
          }
          
          addMessage('assistant', data.message);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
          setError(errorMessage);
          // Remove the user message if request failed
          set(state => ({
            messages: state.messages.slice(0, -1),
          }));
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'kit-chat-storage',
      partialize: (state) => ({
        // Only persist messages (not loading/error state)
        messages: state.messages.slice(-20), // Keep last 20 messages
      }),
    }
  )
);
```

### Step 2: Create components/kit/kit-chat-panel.tsx

```tsx
// components/kit/kit-chat-panel.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useKitStore } from '@/hooks/use-kit-store';
import { cn } from '@/lib/utils';

export function KitChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  } = useKitStore();
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;
    
    setInput('');
    await sendMessage(trimmedInput);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-lg">🐕</span>
          </div>
          <div>
            <h3 className="font-medium text-sm">Kit</h3>
            <p className="text-xs text-muted-foreground">Your Pawkit Assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-purple-400" />
            </div>
            <h4 className="font-medium mb-1">Hey there! I'm Kit 🐕</h4>
            <p className="text-sm text-muted-foreground mb-4">
              I can help you find, organize, and understand your saved content.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Try asking me:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {[
                  "What did I save about React?",
                  "Summarize my recent bookmarks",
                  "Find articles about design",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === 'user'
                      ? 'bg-purple-500 text-white rounded-br-md'
                      : 'bg-white/5 rounded-bl-md'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-muted-foreground">Kit is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
          {error}
        </div>
      )}
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Kit anything..."
            disabled={isLoading}
            className={cn(
              "flex-1 px-4 py-2 rounded-xl text-sm",
              "bg-white/5 border border-white/10",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
              "disabled:opacity-50"
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "px-4 py-2 rounded-xl",
              "bg-purple-500 hover:bg-purple-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 3: Create components/kit/kit-section.tsx (for control panel)

```tsx
// components/kit/kit-section.tsx

'use client';

import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { KitChatPanel } from './kit-chat-panel';

/**
 * Kit section for the control panel sidebar
 * Can be collapsed/expanded
 */
export function KitSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="border-b border-white/10">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-purple-400" />
          <span className="text-sm font-medium">Ask Kit</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>
      
      {/* Chat panel */}
      {isExpanded && (
        <div className="h-[400px] border-t border-white/5">
          <KitChatPanel />
        </div>
      )}
    </div>
  );
}
```

### Step 4: Integration Instructions

Add KitSection to control panels where appropriate. Example for library-controls.tsx:

```tsx
// In components/control-panel/library-controls.tsx
// Add import:
import { KitSection } from '@/components/kit/kit-section';

// Add to the component return, typically at the top:
export function LibraryControls() {
  return (
    <>
      {/* Kit AI Assistant */}
      <KitSection />
      
      {/* Existing controls... */}
      <TodosSection />
      {/* ... */}
    </>
  );
}
```

### Verification for T6
- [ ] hooks/use-kit-store.ts created
- [ ] components/kit/kit-chat-panel.tsx created
- [ ] components/kit/kit-section.tsx created
- [ ] Chat UI renders correctly
- [ ] Messages send and display
- [ ] Loading state works
- [ ] Error handling works
- [ ] Conversation persists (localStorage)

---

## Task T7: Integration & Testing

### Objective
Wire everything together and test end-to-end.

### Step 1: Add Environment Variables

Add to `.env.local`:

```env
# Anthropic API Key (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Kit Feature Flag
NEXT_PUBLIC_KIT_ENABLED=true

# Your Supabase user ID (ONLY this user can access Kit)
# Find it: SELECT id FROM auth.users WHERE email = 'your@email.com'
KIT_ALLOWED_USER_ID=your-uuid-here
```

### Step 2: Add to .env.example

```env
# Kit AI (optional)
ANTHROPIC_API_KEY=
NEXT_PUBLIC_KIT_ENABLED=false
KIT_ALLOWED_USER_ID=
```

### Step 3: Update next.config.js if needed

Ensure the Anthropic API domain is allowed (usually not needed for server-side calls).

### Step 4: Test Checklist

**Auth & Access:**
- [ ] Unauthenticated user gets 401
- [ ] Non-whitelisted user gets 403 with friendly message
- [ ] Whitelisted user can chat

**Chat Functionality:**
- [ ] Simple message works
- [ ] Conversation context maintained
- [ ] Card context passed correctly
- [ ] Response displays correctly

**Rate Limiting:**
- [ ] Usage logged to kit_usage table
- [ ] Rate limit kicks in after threshold
- [ ] Friendly error message shown

**Cost Tracking:**
- [ ] Tokens logged correctly
- [ ] Cost calculated correctly
- [ ] Can query usage stats

**UI:**
- [ ] Chat panel renders in control panel
- [ ] Input works
- [ ] Loading state shows
- [ ] Error state shows
- [ ] Suggestions clickable
- [ ] Clear chat works

### Step 5: Monitoring Queries

Run these in Supabase to monitor usage:

```sql
-- Today's usage
SELECT 
  feature,
  COUNT(*) as requests,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(estimated_cost_cents)::numeric / 100, 4) as total_cost_dollars
FROM kit_usage
WHERE created_at > CURRENT_DATE
GROUP BY feature;

-- This month's total
SELECT 
  ROUND(SUM(estimated_cost_cents)::numeric / 100, 2) as monthly_cost_dollars,
  COUNT(*) as total_requests
FROM kit_usage
WHERE created_at > date_trunc('month', CURRENT_DATE);
```

---

## Environment Variables Summary

```env
# Required for Kit
ANTHROPIC_API_KEY=sk-ant-api03-...          # From console.anthropic.com
NEXT_PUBLIC_KIT_ENABLED=true                 # Enable Kit UI
KIT_ALLOWED_USER_ID=uuid-here                # Your Supabase user ID

# Optional (defaults shown)
# KIT_MODEL_FAST=claude-haiku-4-5-20251001
# KIT_MODEL_SMART=claude-sonnet-4-5-20250929
```

---

## File Checklist

After implementation, these files should exist:

```
lib/ai/
├── kit-config.ts          # Configuration and limits
├── kit-prompts.ts         # System prompts
├── kit-context.ts         # Context builder
└── kit-usage.ts           # Rate limiting and logging

app/api/kit/
├── chat/route.ts          # Main chat endpoint
├── summarize/route.ts     # Summarize card endpoint
└── suggest-tags/route.ts  # Tag suggestion endpoint

components/kit/
├── kit-chat-panel.tsx     # Chat UI
└── kit-section.tsx        # Control panel section

hooks/
└── use-kit-store.ts       # Zustand store for Kit state
```

---

## Cost Estimates

Based on Haiku pricing ($0.25/1M input, $1.25/1M output):

| Usage Level | Requests/Day | Est. Monthly Cost |
|-------------|--------------|-------------------|
| Light | 5 | $0.50 |
| Moderate | 20 | $2.00 |
| Heavy | 50 | $5.00 |
| Very Heavy | 100 | $10.00 |

**Safety**: With rate limits (100/day) and Haiku model, worst case is ~$10-15/month for heavy personal use.

---

## Future Enhancements (Not in Scope)

These are documented for later:

1. **Auto-tag on save** - Automatically suggest/apply tags when saving new cards
2. **Topic Notes** - Generate synthesis notes from multiple related cards
3. **Summarize on demand in card modal** - Button in card detail to summarize
4. **Find similar** - "Find cards similar to this one"
5. **Weekly digest** - AI-generated summary of saved content
6. **MCP Server** - For Claude Desktop integration (free tier for users)

---

## Troubleshooting

### "Kit is coming soon!" error
- Check KIT_ALLOWED_USER_ID matches your Supabase user ID
- Ensure NEXT_PUBLIC_KIT_ENABLED=true

### API errors
- Check ANTHROPIC_API_KEY is valid
- Check Anthropic dashboard for rate limits
- Check server logs for detailed errors

### Rate limit errors
- Check kit_usage table for request counts
- Wait for hourly/daily limit to reset
- Adjust limits in kit-config.ts if needed

### Messages not persisting
- Check localStorage for 'kit-chat-storage'
- Clear localStorage and try again

---

**End of Implementation Plan**
