/**
 * Type Guard 유틸리티 테스트
 *
 * TDD: RED phase - 실패하는 테스트 먼저 작성
 */

import { describe, it, expect } from 'vitest';
import { isError, isSupabaseRow } from './typeGuards';

describe('Type Guards', () => {
  describe('isError', () => {
    it('ShouldReturnTrueWhenErrorObjectProvided', () => {
      const error = new Error('test error');
      expect(isError(error)).toBe(true);
    });

    it('ShouldReturnTrueWhenCustomErrorProvided', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const customError = new CustomError('custom error');
      expect(isError(customError)).toBe(true);
    });

    it('ShouldReturnFalseWhenStringProvided', () => {
      expect(isError('error string')).toBe(false);
    });

    it('ShouldReturnFalseWhenObjectProvided', () => {
      expect(isError({ message: 'error' })).toBe(false);
    });

    it('ShouldReturnFalseWhenNullProvided', () => {
      expect(isError(null)).toBe(false);
    });

    it('ShouldReturnFalseWhenUndefinedProvided', () => {
      expect(isError(undefined)).toBe(false);
    });
  });

  describe('isSupabaseRow', () => {
    it('ShouldReturnTrueWhenValidRowProvided', () => {
      const row = { id: 1, y: 2024, m: 10, d: 15 };
      expect(isSupabaseRow(row)).toBe(true);
    });

    it('ShouldReturnTrueWhenEmptyObjectProvided', () => {
      expect(isSupabaseRow({})).toBe(true);
    });

    it('ShouldReturnFalseWhenNullProvided', () => {
      expect(isSupabaseRow(null)).toBe(false);
    });

    it('ShouldReturnFalseWhenUndefinedProvided', () => {
      expect(isSupabaseRow(undefined)).toBe(false);
    });

    it('ShouldReturnFalseWhenStringProvided', () => {
      expect(isSupabaseRow('not an object')).toBe(false);
    });

    it('ShouldReturnFalseWhenNumberProvided', () => {
      expect(isSupabaseRow(123)).toBe(false);
    });

    it('ShouldReturnFalseWhenArrayProvided', () => {
      expect(isSupabaseRow([])).toBe(false);
    });
  });
});
