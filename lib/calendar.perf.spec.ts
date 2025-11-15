/**
 * Calendar Performance Optimization Test Suite
 *
 * TDD Red-Green-Refactor:
 * 🔴 Red: Write failing tests first
 * 🟢 Green: Implement minimum code to pass
 * ♻️ Refactor: Improve code without changing behavior
 *
 * v0.33.9: Optimize Calendar resize performance
 */

import { describe, test, expect } from 'vitest';
import { computeCellMinWidth } from '@/lib/calendar-utils';

describe('Calendar Performance Utilities', () => {
  describe('computeCellMinWidth', () => {
    test('should return mobile min width (160px) for narrow viewport', () => {
      // Mobile: clamp(160px, 28vw, 180px)
      // viewport = 500px => 28vw = 140px => clamp returns 160px
      const result = computeCellMinWidth(500);
      expect(result).toBe(160);
    });

    test('should return mobile calculated width for mid-range viewport', () => {
      // Mobile: clamp(160px, 28vw, 180px)
      // viewport = 600px => 28vw = 168px => clamp returns 168px
      const result = computeCellMinWidth(600);
      expect(result).toBe(168);
    });

    test('should return desktop min width for viewport just above mobile breakpoint', () => {
      // Desktop: clamp(170px, 10vw, 220px)
      // viewport = 800px => 10vw = 80px => clamp returns 170px
      const result = computeCellMinWidth(800);
      expect(result).toBe(170);
    });

    test('should return desktop min width (170px) for narrow desktop viewport', () => {
      // Desktop: clamp(170px, 10vw, 220px)
      // viewport = 1000px => 10vw = 100px => clamp returns 170px
      const result = computeCellMinWidth(1000);
      expect(result).toBe(170);
    });

    test('should return desktop calculated width for mid-range desktop viewport', () => {
      // Desktop: clamp(170px, 10vw, 220px)
      // viewport = 2000px => 10vw = 200px => clamp returns 200px
      const result = computeCellMinWidth(2000);
      expect(result).toBe(200);
    });

    test('should return desktop max width (220px) for very wide viewport', () => {
      // Desktop: clamp(170px, 10vw, 220px)
      // viewport = 3000px => 10vw = 300px => clamp returns 220px
      const result = computeCellMinWidth(3000);
      expect(result).toBe(220);
    });

    test('should handle mobile breakpoint boundary (768px)', () => {
      // Exactly at mobile breakpoint
      const result = computeCellMinWidth(768);
      expect(result).toBe(180); // Mobile: 28% * 768 = 215.04 => clamped to 180
    });

    test('should handle desktop breakpoint boundary (769px)', () => {
      // Just above mobile breakpoint
      const result = computeCellMinWidth(769);
      expect(result).toBe(170); // Desktop: 10% * 769 = 76.9 => clamped to 170
    });
  });
});
