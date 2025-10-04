'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Note } from '@/types/note';
import { normalizeNote } from '@/types/note';
import { createClient } from '@/lib/supabaseClient';

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
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    // 검색어 대치 맵
    const replacements: Record<string, string> = {
      '엄악': '음악',
    };

    // 검색어 변환
    let q = searchQuery.toLowerCase();
    Object.entries(replacements).forEach(([from, to]) => {
      q = q.replace(from.toLowerCase(), to.toLowerCase());
    });

    const found: SearchResult[] = [];

    try {
      // Supabase에서 전체 notes 가져오기
      const { data: allNotes, error } = await supabase
        .from('notes')
        .select('*')
        .order('y', { ascending: false })
        .order('m', { ascending: false })
        .order('d', { ascending: false });

      if (error) throw error;
      if (!allNotes) {
        setResults([]);
        setLoading(false);
        return;
      }

      allNotes.forEach((row) => {
        const note = normalizeNote(row);
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

      setResults(found);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
          {loading && (
            <div className="search-empty">검색 중...</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}

          {!loading && results.map((result, idx) => (
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
