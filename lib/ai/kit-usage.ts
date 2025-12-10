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

  try {
    // Check hourly limit
    const { count: hourlyCount, error: hourlyError } = await supabase
      .from('kit_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', hourAgo.toISOString());

    if (hourlyError) {
      console.error('[Kit] Rate limit check error:', JSON.stringify(hourlyError));
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
      console.error('[Kit] Daily rate limit check error:', JSON.stringify(dailyError));
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
  } catch (err) {
    console.error('[Kit] Rate limit exception:', err);
    return { allowed: true };
  }
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

  const insertData = {
    user_id: userId,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_cents: totalCostCents,
    feature: usage.feature,
    request_summary: usage.requestSummary?.slice(0, 200),
  };

  console.log('[Kit] Attempting to log usage:', JSON.stringify(insertData));

  try {
    const { data, error, status, statusText } = await supabase
      .from('kit_usage')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[Kit] Failed to log usage - error:', JSON.stringify(error));
      console.error('[Kit] Failed to log usage - status:', status, statusText);
    } else {
      console.log('[Kit] Usage logged successfully:', data);
    }
  } catch (err) {
    console.error('[Kit] Usage logging exception:', err);
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
