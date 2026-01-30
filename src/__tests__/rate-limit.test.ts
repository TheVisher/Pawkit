import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '../lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', () => {
    const result = checkRateLimit('test-user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9); // default 10 - 1
  });

  it('tracks request count correctly', () => {
    const identifier = 'test-user-2';

    for (let i = 0; i < 5; i++) {
      checkRateLimit(identifier);
    }

    const result = checkRateLimit(identifier);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4); // 10 - 6
  });

  it('blocks requests after limit exceeded', () => {
    const identifier = 'test-user-3';
    const maxRequests = 3;

    // Make requests up to the limit
    for (let i = 0; i < maxRequests; i++) {
      const result = checkRateLimit(identifier, 60000, maxRequests);
      expect(result.success).toBe(true);
    }

    // Next request should be blocked
    const result = checkRateLimit(identifier, 60000, maxRequests);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const identifier = 'test-user-4';
    const windowMs = 60000;
    const maxRequests = 3;

    // Use up the limit
    for (let i = 0; i < maxRequests; i++) {
      checkRateLimit(identifier, windowMs, maxRequests);
    }

    // Should be blocked
    expect(checkRateLimit(identifier, windowMs, maxRequests).success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1);

    // Should be allowed again
    const result = checkRateLimit(identifier, windowMs, maxRequests);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(maxRequests - 1);
  });

  it('handles different identifiers separately', () => {
    const maxRequests = 2;

    // User 1 uses up their limit
    checkRateLimit('user-a', 60000, maxRequests);
    checkRateLimit('user-a', 60000, maxRequests);
    expect(checkRateLimit('user-a', 60000, maxRequests).success).toBe(false);

    // User 2 should still be allowed
    const result = checkRateLimit('user-b', 60000, maxRequests);
    expect(result.success).toBe(true);
  });

  it('uses custom window and limit', () => {
    const identifier = 'custom-user';
    const windowMs = 1000;
    const maxRequests = 2;

    checkRateLimit(identifier, windowMs, maxRequests);
    checkRateLimit(identifier, windowMs, maxRequests);

    // Should be blocked
    expect(checkRateLimit(identifier, windowMs, maxRequests).success).toBe(false);

    // Advance past custom window
    vi.advanceTimersByTime(1001);

    // Should be allowed
    expect(checkRateLimit(identifier, windowMs, maxRequests).success).toBe(true);
  });
});
