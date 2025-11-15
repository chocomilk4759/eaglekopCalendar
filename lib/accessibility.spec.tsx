/**
 * ARIA Accessibility Test Suite
 *
 * TDD Red-Green-Refactor 사이클:
 * 🔴 Red: 테스트 작성 (이 파일)
 * 🟢 Green: ARIA 속성 추가하여 테스트 통과
 * ♻️ Refactor: 코드 개선
 *
 * WCAG 2.1 Level AA 준수 목표
 *
 * 수동 검증 체크리스트 (Calendar.tsx):
 * ✅ 이전 달 버튼 (◀): aria-label="이전 달" - Line 1187
 * ✅ 다음 달 버튼 (▶): aria-label="다음 달" - Line 1201
 * ✅ 날짜 이동 버튼 (➜): aria-label="이동" - Already implemented
 * ✅ 검색 버튼 (🔍): aria-label="검색" - Already implemented
 * ✅ 미정 일정 버튼 (?): aria-label="미정 일정" - Already implemented
 */

import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import AlertModal from '@/app/components/AlertModal';
import ConfirmModal from '@/app/components/ConfirmModal';
import SearchModal from '@/app/components/SearchModal';
import DateInfoModal from '@/app/components/DateInfoModal';

describe('ARIA Accessibility', () => {
  describe('AlertModal - Dialog Semantics', () => {
    test('should have role="alertdialog"', () => {
      const { container } = render(
        <AlertModal
          open={true}
          title="테스트 제목"
          message="테스트 메시지"
          onClose={() => {}}
          buttonText="확인"
        />
      );

      // Debug: check what's actually rendered
      const dialog = container.querySelector('[role="alertdialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog).toHaveAttribute('role', 'alertdialog');
    });

    test('should have aria-modal="true"', () => {
      const { container } = render(
        <AlertModal
          open={true}
          title="테스트 제목"
          message="테스트 메시지"
          onClose={() => {}}
          buttonText="확인"
        />
      );

      const dialog = container.querySelector('[role="alertdialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    test('should have aria-labelledby pointing to title', () => {
      const { container } = render(
        <AlertModal
          open={true}
          title="테스트 제목"
          message="테스트 메시지"
          onClose={() => {}}
          buttonText="확인"
        />
      );

      const dialog = container.querySelector('[role="alertdialog"]');
      const labelId = dialog?.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const title = document.getElementById(labelId!);
      expect(title?.textContent).toBe('테스트 제목');
    });

    test('should have aria-describedby pointing to message', () => {
      const { container } = render(
        <AlertModal
          open={true}
          title="테스트 제목"
          message="테스트 메시지"
          onClose={() => {}}
          buttonText="확인"
        />
      );

      const dialog = container.querySelector('[role="alertdialog"]');
      const descId = dialog?.getAttribute('aria-describedby');
      expect(descId).toBeTruthy();

      const message = document.getElementById(descId!);
      expect(message?.textContent).toBe('테스트 메시지');
    });
  });

  describe('ConfirmModal - Dialog Semantics (Already Implemented)', () => {
    test('should have role="dialog"', () => {
      const { container } = render(
        <ConfirmModal
          open={true}
          title="테스트 제목"
          message="확인하시겠습니까?"
          onConfirm={() => {}}
          onClose={() => {}}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    test('should have aria-modal="true"', () => {
      const { container } = render(
        <ConfirmModal
          open={true}
          title="테스트 제목"
          message="확인하시겠습니까?"
          onConfirm={() => {}}
          onClose={() => {}}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('SearchModal - Dialog Semantics', () => {
    test('should have role="dialog"', () => {
      const { container } = render(
        <SearchModal open={true} onClose={() => {}} notes={{}} onSelectDate={() => {}} />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    test('should have aria-modal="true"', () => {
      const { container } = render(
        <SearchModal open={true} onClose={() => {}} notes={{}} onSelectDate={() => {}} />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    test('should have aria-label', () => {
      const { container } = render(
        <SearchModal open={true} onClose={() => {}} notes={{}} onSelectDate={() => {}} />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-label')).toBe('검색');
    });

    test('close button should have aria-label', () => {
      const { container } = render(
        <SearchModal open={true} onClose={() => {}} notes={{}} onSelectDate={() => {}} />
      );

      const closeBtn = container.querySelector('.search-close');
      expect(closeBtn).toHaveAttribute('aria-label', '닫기');
    });

    test('search results should have aria-live region', () => {
      const { container } = render(
        <SearchModal open={true} onClose={() => {}} notes={{}} onSelectDate={() => {}} />
      );

      const results = container.querySelector('.search-results');
      expect(results).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('DateInfoModal - Dialog Semantics', () => {
    test('should have role="dialog"', () => {
      const { container } = render(
        <DateInfoModal
          open={true}
          onClose={() => {}}
          date={{ y: 2025, m: 0, d: 15 }}
          note={null}
          canEdit={false}
          onSaved={() => {}}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    test('should have aria-modal="true"', () => {
      const { container } = render(
        <DateInfoModal
          open={true}
          onClose={() => {}}
          date={{ y: 2025, m: 0, d: 15 }}
          note={null}
          canEdit={false}
          onSaved={() => {}}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    test('should have aria-labelledby pointing to title', () => {
      const { container } = render(
        <DateInfoModal
          open={true}
          onClose={() => {}}
          date={{ y: 2025, m: 0, d: 15 }}
          note={null}
          canEdit={false}
          onSaved={() => {}}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      const labelId = dialog?.getAttribute('aria-labelledby');
      expect(labelId).toBe('date-modal-title');

      const title = document.getElementById(labelId!);
      expect(title).toBeTruthy();
    });
  });
});
