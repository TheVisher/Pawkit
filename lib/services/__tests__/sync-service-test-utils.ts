/**
 * Sync Service Test Utilities
 *
 * Provides mock data, helpers, and utilities for testing sync service functionality.
 */

import type { CardDTO, CollectionNode } from '@/types';

/**
 * Create a mock card with configurable properties
 */
export function createMockCard(overrides: Partial<CardDTO> = {}): CardDTO {
  const id = overrides.id || `card-${Date.now()}-${Math.random()}`;
  const now = new Date().toISOString();

  return {
    id,
    userId: overrides.userId || 'test-user-id',
    url: overrides.url || `https://example.com/${id}`,
    title: overrides.title || `Test Card ${id}`,
    description: overrides.description || null,
    image: overrides.image || null,
    domain: overrides.domain || 'example.com',
    articleContent: overrides.articleContent || null,
    metadata: overrides.metadata || null,
    notes: overrides.notes || null,
    inDen: overrides.inDen ?? false,
    deleted: overrides.deleted ?? false,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  };
}

/**
 * Create a mock collection with configurable properties
 */
export function createMockCollection(overrides: Partial<CollectionNode> = {}): CollectionNode {
  const id = overrides.id || `collection-${Date.now()}-${Math.random()}`;
  const now = new Date().toISOString();

  return {
    id,
    userId: overrides.userId || 'test-user-id',
    name: overrides.name || `Test Collection ${id}`,
    slug: overrides.slug || `test-collection-${id}`,
    parentId: overrides.parentId || null,
    order: overrides.order ?? 0,
    deleted: overrides.deleted ?? false,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    children: overrides.children || [],
    ...overrides,
  };
}

/**
 * Create a mock card with rich metadata for quality scoring tests
 */
export function createRichMetadataCard(overrides: Partial<CardDTO> = {}): CardDTO {
  return createMockCard({
    title: 'Understanding TypeScript: A Comprehensive Guide',
    description: 'An in-depth exploration of TypeScript covering types, interfaces, generics, and advanced patterns for building robust applications.',
    image: 'https://cdn.example.com/images/typescript-guide-banner.jpg',
    articleContent: 'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. In this comprehensive guide, we will explore the core concepts of TypeScript including type annotations, interfaces, classes, generics, and more. We will also dive into advanced topics such as conditional types, mapped types, and utility types that make TypeScript a powerful tool for modern web development.',
    metadata: {
      author: 'John Doe',
      publishedDate: '2024-01-15',
      tags: ['typescript', 'javascript', 'programming', 'web development'],
      readingTime: '15 min',
    },
    ...overrides,
  });
}

/**
 * Create a mock card with poor/empty metadata for quality scoring tests
 */
export function createPoorMetadataCard(overrides: Partial<CardDTO> = {}): CardDTO {
  return createMockCard({
    title: 'https://example.com/article',
    description: '',
    image: 'img.jpg',
    articleContent: null,
    metadata: {},
    ...overrides,
  });
}

/**
 * Mock fetch function for network testing
 */
export class MockFetch {
  private responses: Map<string, any> = new Map();
  private delays: Map<string, number> = new Map();
  private errors: Map<string, Error> = new Map();

  /**
   * Set a mock response for a URL pattern
   */
  mockResponse(urlPattern: string, response: any, options?: { delay?: number }) {
    this.responses.set(urlPattern, response);
    if (options?.delay) {
      this.delays.set(urlPattern, options.delay);
    }
  }

  /**
   * Set a mock error for a URL pattern
   */
  mockError(urlPattern: string, error: Error) {
    this.errors.set(urlPattern, error);
  }

  /**
   * Set a timeout for a URL pattern (never resolves)
   */
  mockTimeout(urlPattern: string) {
    this.delays.set(urlPattern, Infinity);
  }

  /**
   * Get the mock fetch function
   */
  getFetch() {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      // Find matching pattern
      const pattern = Array.from(this.responses.keys()).find(p => url.includes(p)) ||
                     Array.from(this.errors.keys()).find(p => url.includes(p)) ||
                     Array.from(this.delays.keys()).find(p => url.includes(p));

      if (!pattern) {
        throw new Error(`No mock configured for URL: ${url}`);
      }

      // Check for error
      const error = this.errors.get(pattern);
      if (error) {
        throw error;
      }

      // Check for delay
      const delay = this.delays.get(pattern) || 0;
      if (delay === Infinity) {
        // Simulate timeout by waiting forever
        await new Promise(() => {});
      }
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Return mock response
      const response = this.responses.get(pattern);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
  }

  /**
   * Reset all mocks
   */
  reset() {
    this.responses.clear();
    this.delays.clear();
    this.errors.clear();
  }
}

/**
 * Test result tracker
 */
export class TestRunner {
  private results: Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error?: Error;
  }> = [];

  private currentTest: string | null = null;
  private startTime: number = 0;

  /**
   * Run a test case
   */
  async test(name: string, fn: () => Promise<void>): Promise<void> {
    this.currentTest = name;
    this.startTime = Date.now();

    try {
      await fn();
      this.results.push({
        name,
        status: 'pass',
        duration: Date.now() - this.startTime,
      });
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      this.results.push({
        name,
        status: 'fail',
        duration: Date.now() - this.startTime,
        error: error as Error,
      });
      console.error(`❌ FAIL: ${name}`, error);
    } finally {
      this.currentTest = null;
    }
  }

  /**
   * Skip a test case
   */
  skip(name: string) {
    this.results.push({
      name,
      status: 'skip',
      duration: 0,
    });
    console.log(`⏭️  SKIP: ${name}`);
  }

  /**
   * Assert a condition
   */
  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert equality
   */
  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, got ${actual}`
      );
    }
  }

  /**
   * Assert deep equality for objects
   */
  assertDeepEqual(actual: any, expected: any, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  }

  /**
   * Assert that a value includes a substring or item
   */
  assertContains(haystack: any, needle: any, message?: string) {
    const contains = Array.isArray(haystack)
      ? haystack.includes(needle)
      : String(haystack).includes(String(needle));

    if (!contains) {
      throw new Error(
        message || `Expected ${haystack} to contain ${needle}`
      );
    }
  }

  /**
   * Wait for a condition to become true
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 5000;
    const interval = options.interval || 100;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }

  /**
   * Get test results summary
   */
  getSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      passRate: total > 0 ? (passed / (total - skipped)) * 100 : 0,
      results: this.results,
    };
  }

  /**
   * Print test results
   */
  printSummary() {
    const summary = this.getSummary();

    console.log('\n===========================================');
    console.log('           TEST SUMMARY');
    console.log('===========================================');
    console.log(`Total Tests:    ${summary.total}`);
    console.log(`✅ Passed:      ${summary.passed}`);
    console.log(`❌ Failed:      ${summary.failed}`);
    console.log(`⏭️  Skipped:     ${summary.skipped}`);
    console.log(`📊 Pass Rate:   ${summary.passRate.toFixed(2)}%`);
    console.log(`⏱️  Duration:    ${summary.duration}ms`);
    console.log('===========================================\n');

    if (summary.failed > 0) {
      console.log('Failed Tests:');
      summary.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  ❌ ${r.name}`);
          if (r.error) {
            console.log(`     ${r.error.message}`);
          }
        });
      console.log('\n');
    }

    return summary;
  }
}

/**
 * Delay helper for tests
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a date in the past
 */
export function dateInPast(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/**
 * Create a date in the future
 */
export function dateInFuture(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
