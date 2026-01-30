import { describe, it, expect } from 'vitest';
import { validatePassword } from '../lib/password-validator';

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('accepts a password meeting all requirements', () => {
      const result = validatePassword('MySecure123!@#');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts exactly 12 characters with all requirements', () => {
      const result = validatePassword('Abcdefgh12!@');
      expect(result.valid).toBe(true);
    });

    it('accepts various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '-', '+', '='];
      specialChars.forEach((char) => {
        const password = `Abcdefgh123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('invalid passwords', () => {
    it('rejects password shorter than 12 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('rejects password without uppercase letter', () => {
      const result = validatePassword('mysecure123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain an uppercase letter');
    });

    it('rejects password without lowercase letter', () => {
      const result = validatePassword('MYSECURE123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a lowercase letter');
    });

    it('rejects password without number', () => {
      const result = validatePassword('MySecurePass!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a number');
    });

    it('rejects password without special character', () => {
      const result = validatePassword('MySecure12345');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a special character (!@#$%^&*...)');
    });

    it('returns multiple errors for password failing multiple requirements', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('handles unicode characters', () => {
      const result = validatePassword('MySecure123!émoji');
      expect(result.valid).toBe(true);
    });
  });
});
