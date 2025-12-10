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
