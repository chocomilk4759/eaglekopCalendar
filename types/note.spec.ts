/**
 * types/note.ts 테스트
 *
 * TDD 패턴: 시간 검증, 정규화, Note 변환 로직 검증
 */

import { describe, it, expect } from 'vitest';
import {
  isValidStartTime,
  normalizeStartTime,
  setItemTime,
  normalizeNote,
  type Note,
  type Item,
} from './note';

describe('note types', () => {
  describe('isValidStartTime', () => {
    it('ShouldReturnTrueWhenTimeIsValid', () => {
      expect(isValidStartTime('00:00')).toBe(true);
      expect(isValidStartTime('12:30')).toBe(true);
      expect(isValidStartTime('23:59')).toBe(true);
      expect(isValidStartTime('09:15')).toBe(true);
    });

    it('ShouldReturnFalseWhenTimeIsInvalid', () => {
      expect(isValidStartTime('24:00')).toBe(false); // Hour out of range
      expect(isValidStartTime('23:60')).toBe(false); // Minute out of range
      expect(isValidStartTime('9:30')).toBe(false); // Missing leading zero
      expect(isValidStartTime('12:5')).toBe(false); // Missing leading zero
      expect(isValidStartTime('25:00')).toBe(false); // Invalid hour
      expect(isValidStartTime('12:99')).toBe(false); // Invalid minute
      expect(isValidStartTime('abc')).toBe(false); // Not a time
      expect(isValidStartTime('12')).toBe(false); // Missing minutes
      expect(isValidStartTime('12:')).toBe(false); // Missing minutes
    });

    it('ShouldReturnTrueWhenTimeIsEmptyOrUndefined', () => {
      expect(isValidStartTime('')).toBe(true);
      expect(isValidStartTime(undefined)).toBe(true);
    });

    it('ShouldHandleBoundaryValues', () => {
      expect(isValidStartTime('00:00')).toBe(true); // Min time
      expect(isValidStartTime('23:59')).toBe(true); // Max time
      expect(isValidStartTime('24:00')).toBe(false); // Just beyond max
    });
  });

  describe('normalizeStartTime', () => {
    it('ShouldReturnUndefinedWhenInputIsEmpty', () => {
      expect(normalizeStartTime('')).toBe(undefined);
      expect(normalizeStartTime(undefined)).toBe(undefined);
      expect(normalizeStartTime('   ')).toBe(undefined);
    });

    it('ShouldReturnTrimmedValueWhenValid', () => {
      expect(normalizeStartTime('12:30')).toBe('12:30');
      expect(normalizeStartTime('  12:30  ')).toBe('12:30');
      expect(normalizeStartTime('00:00')).toBe('00:00');
    });

    it('ShouldReturnUndefinedWhenInvalid', () => {
      expect(normalizeStartTime('25:00')).toBe(undefined);
      expect(normalizeStartTime('12:99')).toBe(undefined);
      expect(normalizeStartTime('invalid')).toBe(undefined);
    });

    it('ShouldTrimWhitespace', () => {
      expect(normalizeStartTime('  14:30  ')).toBe('14:30');
      expect(normalizeStartTime('\t12:00\n')).toBe('12:00');
    });
  });

  describe('setItemTime', () => {
    const baseItem: Item = {
      emoji: null,
      text: 'Test item',
    };

    it('ShouldSetValidStartTimeAndNextDay', () => {
      const result = setItemTime(baseItem, '14:30', true);

      expect(result.startTime).toBe('14:30');
      expect(result.nextDay).toBe(true);
    });

    it('ShouldSetValidStartTimeWithoutNextDay', () => {
      const result = setItemTime(baseItem, '14:30', false);

      expect(result.startTime).toBe('14:30');
      expect(result.nextDay).toBe(false);
    });

    it('ShouldClearNextDayWhenStartTimeIsEmpty', () => {
      const result = setItemTime(baseItem, '', true);

      expect(result.startTime).toBe(undefined);
      expect(result.nextDay).toBe(undefined);
    });

    it('ShouldClearNextDayWhenStartTimeIsInvalid', () => {
      const result = setItemTime(baseItem, '25:00', true);

      expect(result.startTime).toBe(undefined);
      expect(result.nextDay).toBe(undefined);
    });

    it('ShouldDefaultNextDayToFalseWhenNotProvided', () => {
      const result = setItemTime(baseItem, '14:30', undefined);

      expect(result.startTime).toBe('14:30');
      expect(result.nextDay).toBe(false);
    });

    it('ShouldPreserveOtherItemProperties', () => {
      const itemWithProps: Item = {
        emoji: '🎉',
        text: 'Party',
        emojiOnly: true,
      };

      const result = setItemTime(itemWithProps, '20:00', false);

      expect(result.emoji).toBe('🎉');
      expect(result.text).toBe('Party');
      expect(result.emojiOnly).toBe(true);
      expect(result.startTime).toBe('20:00');
      expect(result.nextDay).toBe(false);
    });

    it('ShouldTrimWhitespaceInStartTime', () => {
      const result = setItemTime(baseItem, '  14:30  ', true);

      expect(result.startTime).toBe('14:30');
      expect(result.nextDay).toBe(true);
    });
  });

  describe('normalizeNote', () => {
    it('ShouldFillDefaultValuesWhenEmpty', () => {
      const result = normalizeNote({});

      expect(result.id).toBe(undefined);
      expect(result.y).toBe(0);
      expect(result.m).toBe(0);
      expect(result.d).toBe(1);
      expect(result.content).toBe('');
      expect(result.items).toEqual([]);
      expect(result.color).toBe(null);
      expect(result.link).toBe(null);
      expect(result.image_url).toBe(null);
      expect(result.title).toBe(null);
      expect(result.use_image_as_bg).toBe(false);
    });

    it('ShouldPreserveValidFields', () => {
      const input: Partial<Note> = {
        id: 123,
        y: 2024,
        m: 0,
        d: 15,
        content: 'Test content',
        items: [{ emoji: '📅', text: 'Event' }],
        color: 'red',
        link: 'https://example.com',
        image_url: 'https://example.com/image.jpg',
        title: 'Test Title',
        use_image_as_bg: true,
      };

      const result = normalizeNote(input);

      expect(result.id).toBe(123);
      expect(result.y).toBe(2024);
      expect(result.m).toBe(0);
      expect(result.d).toBe(15);
      expect(result.content).toBe('Test content');
      expect(result.items).toEqual([{ emoji: '📅', text: 'Event' }]);
      expect(result.color).toBe('red');
      expect(result.link).toBe('https://example.com');
      expect(result.image_url).toBe('https://example.com/image.jpg');
      expect(result.title).toBe('Test Title');
      expect(result.use_image_as_bg).toBe(true);
    });

    it('ShouldNormalizeColorFieldToNull', () => {
      expect(normalizeNote({ color: 'red' }).color).toBe('red');
      expect(normalizeNote({ color: 'blue' }).color).toBe('blue');
      expect(normalizeNote({ color: 'green' as NoteColor }).color).toBe(null);
      expect(normalizeNote({ color: 'invalid' as NoteColor }).color).toBe(null);
      expect(normalizeNote({ color: null }).color).toBe(null);
    });

    it('ShouldHandleNonArrayItems', () => {
      const result1 = normalizeNote({ items: 'not an array' as unknown as Item[] });
      expect(result1.items).toEqual([]);

      const result2 = normalizeNote({ items: null as unknown as Item[] });
      expect(result2.items).toEqual([]);

      const result3 = normalizeNote({ items: undefined });
      expect(result3.items).toEqual([]);
    });

    it('ShouldHandlePartialDates', () => {
      const result1 = normalizeNote({ y: 2024 });
      expect(result1.y).toBe(2024);
      expect(result1.m).toBe(0);
      expect(result1.d).toBe(1);

      const result2 = normalizeNote({ y: 2024, m: 5 });
      expect(result2.y).toBe(2024);
      expect(result2.m).toBe(5);
      expect(result2.d).toBe(1);
    });

    it('ShouldHandleExtraFields', () => {
      const input = {
        y: 2024,
        m: 0,
        d: 1,
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      const result = normalizeNote(input);

      expect(result.y).toBe(2024);
      expect(result.m).toBe(0);
      expect(result.d).toBe(1);
      // Extra fields are not preserved (type system prevents access)
    });

    it('ShouldConvertUndefinedToNullForOptionalFields', () => {
      const result = normalizeNote({
        link: undefined,
        image_url: undefined,
        title: undefined,
      });

      expect(result.link).toBe(null);
      expect(result.image_url).toBe(null);
      expect(result.title).toBe(null);
    });

    it('ShouldHandleComplexItems', () => {
      const items: Item[] = [
        {
          emoji: '🎉',
          text: 'Party',
          emojiOnly: false,
          startTime: '20:00',
          nextDay: true,
        },
        {
          emoji: null,
          text: 'Text only item',
        },
        {
          emoji: '⚽',
          text: '',
          emojiOnly: true,
        },
      ];

      const result = normalizeNote({ items });

      expect(result.items).toHaveLength(3);
      expect(result.items[0].emoji).toBe('🎉');
      expect(result.items[0].startTime).toBe('20:00');
      expect(result.items[0].nextDay).toBe(true);
      expect(result.items[1].emoji).toBe(null);
      expect(result.items[2].emojiOnly).toBe(true);
    });

    it('ShouldHandleZeroValuesCorrectly', () => {
      const result = normalizeNote({
        y: 0,
        m: 0,
        d: 0,
      });

      expect(result.y).toBe(0); // 0 is preserved for y
      expect(result.m).toBe(0); // 0 is preserved for m
      expect(result.d).toBe(0); // 0 is preserved for d (though invalid, function doesn't validate)
    });

    it('ShouldHandleFalsyValues', () => {
      const result = normalizeNote({
        content: '',
        use_image_as_bg: false,
        items: [],
      });

      expect(result.content).toBe('');
      expect(result.use_image_as_bg).toBe(false);
      expect(result.items).toEqual([]);
    });
  });
});
