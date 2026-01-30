import { describe, it, expect } from 'vitest';
import { cn, slugify } from '../lib/utils';

describe('cn (classnames utility)', () => {
  it('merges simple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('slugify', () => {
  it('converts simple text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles multiple spaces', () => {
    expect(slugify('Hello   World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('handles leading and trailing spaces', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('handles mixed case', () => {
    expect(slugify('HeLLo WoRLD')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('---hello-world---')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('handles numbers', () => {
    expect(slugify('Chapter 1 Introduction')).toBe('chapter-1-introduction');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });

  it('preserves hyphens in the middle', () => {
    expect(slugify('pre-existing-slug')).toBe('pre-existing-slug');
  });

  it('handles underscores', () => {
    expect(slugify('hello_world')).toBe('hello_world');
  });
});
