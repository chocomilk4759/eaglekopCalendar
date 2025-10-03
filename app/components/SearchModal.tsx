'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Note } from '@/types/note';

interface SearchResult {
  date: { y: number; m: number; d: number };
  note: Note;
  matchType: 'title' | 'content' | 'chip' | 'date';
  matchText: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  notes: Record<string, Note>;
  onSelectDate: (y: number, m: number, d: number) => void;
}

export default function SearchModal({ open, onClose, notes, onSelectDate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const found: SearchResult[] = [];

    Object.entries(notes).forEach(([key, note]) => {
      if (!note) return;

      const { y, m, d } = note;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // 날짜 검색
      if (dateStr.includes(q) || `${m + 1}월 ${d}일`.includes(q)) {
        found.push({
          date: { y, m, d },
          note,
          matchType: 'date',
          matchText: dateStr,
        });
        return;
      }

      // 제목 검색
      if (note.title && note.title.toLowerCase().includes(q)) {
        found.push({
          date: { y, m, d },
          note,
          matchType: 'title',
          matchText: note.title,
        });
        return;
      }

      // 내용 검색
      if (note.content && note.content.toLowerCase().includes(q)) {
        found.push({
          date: { y, m, d },
          note,
          matchType: 'content',
          matchText: note.content.substring(0, 100),
        });
        return;
      }

      // 칩 검색
      if (note.items && note.items.length > 0) {
        for (const item of note.items) {
          const chipText = item.text || item.label;
          if (chipText.toLowerCase().includes(q)) {
            found.push({
              date: { y, m, d },
              note,
              matchType: 'chip',
              matchText: chipText,
            });
            return;
          }
        }
      }
    });

    // 날짜 순으로 정렬 (최신순)
    found.sort((a, b) => {
      if (a.date.y !== b.date.y) return b.date.y - a.date.y;
      if (a.date.m !== b.date.m) return b.date.m - a.date.m;
      return b.date.d - a.date.d;
    });

    setResults(found);
  }, [notes]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    onSelectDate(result.date.y, result.date.m, result.date.d);
    onClose();
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'title': return '제목';
      case 'content': return '내용';
      case 'chip': return '태그';
      case 'date': return '날짜';
      default: return '';
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <input
            type="text"
            className="search-input"
            placeholder="날짜, 제목, 내용, 태그로 검색... (ESC로 닫기)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="search-close" onClick={onClose}>✕</button>
        </div>

        <div className="search-results">
          {query.trim() && results.length === 0 && (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}

          {results.map((result, idx) => (
            <div
              key={`${result.date.y}-${result.date.m}-${result.date.d}-${idx}`}
              className="search-result-item"
              onClick={() => handleSelect(result)}
            >
              <div className="search-result-header">
                <span className="search-result-date">
                  {result.date.y}년 {result.date.m + 1}월 {result.date.d}일
                </span>
                <span className="search-result-type">{getMatchTypeLabel(result.matchType)}</span>
              </div>
              {result.note.title && (
                <div className="search-result-title">{result.note.title}</div>
              )}
              <div className="search-result-text">{result.matchText}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
