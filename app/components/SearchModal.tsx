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
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // search_mappings 테이블에서 검색 키워드 맵 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('search_mappings')
        .select('keyword, target, enabled')
        .eq('enabled', true)
        .order('sort_order', { ascending: true });

      if (cancelled) return;

      const map: Record<string, string> = {};

      if (!error && data) {
        // search_mappings에서 키워드 추출
        data.forEach((mapping) => {
          const keyword = (mapping.keyword || '').trim();
          const target = (mapping.target || '').trim();

          if (keyword && target) {
            map[keyword.toLowerCase()] = target.toLowerCase();
          }
        });
      }

      // 하드코딩 폴백 (DB 연결 실패 시 대비)
      if (Object.keys(map).length === 0) {
        const fallbackMappings = [
          { keyword: '엄악', target: '음악' },
          { keyword: '공지', target: '📢' },
          { keyword: '알림', target: '🔔' },
          { keyword: '축구', target: '⚽' },
          { keyword: '야구', target: '⚾' },
          { keyword: '그랑프리', target: '🏁' },
          { keyword: '촌지', target: '🥎' },
          { keyword: '대회', target: '🏆' },
          { keyword: '게임', target: '🎮' },
          { keyword: '함께', target: '📺' },
          { keyword: '같이', target: '📺' },
          { keyword: '합방', target: '🤼‍♂️' },
          { keyword: '저챗', target: '👄' },
          { keyword: '노가리', target: '👄' },
          { keyword: '광고', target: '🍚' },
          { keyword: '노래', target: '🎤' },
          { keyword: '컨텐츠', target: '💙' },
        ];

        fallbackMappings.forEach(({ keyword, target }) => {
          map[keyword.toLowerCase()] = target.toLowerCase();
        });
      }

      setReplacements(map);
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    // 검색어 확장: 원본 + 매핑된 키워드들
    const baseQuery = searchQuery.toLowerCase().trim();
    const searchTerms = new Set<string>([baseQuery]);

    // replacements에서 매칭되는 모든 변환 키워드 추가
    Object.entries(replacements).forEach(([from, to]) => {
      if (baseQuery.includes(from.toLowerCase())) {
        searchTerms.add(to.toLowerCase());
      }
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

        // 확장된 검색어 중 하나라도 매칭되는지 확인
        const matchesAnyTerm = (text: string): boolean => {
          const lowerText = text.toLowerCase();
          return Array.from(searchTerms).some(term => lowerText.includes(term));
        };

        // 날짜 검색
        if (matchesAnyTerm(dateStr) || matchesAnyTerm(`${m + 1}월 ${d}일`)) {
          found.push({
            date: { y, m, d },
            note,
            matchType: 'date',
            matchText: dateStr,
          });
          return;
        }

        // 제목 검색
        if (note.title && matchesAnyTerm(note.title)) {
          found.push({
            date: { y, m, d },
            note,
            matchType: 'title',
            matchText: note.title,
          });
          return;
        }

        // 내용 검색
        if (note.content && matchesAnyTerm(note.content)) {
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
            const chipEmoji = item.emoji || '';
            // 텍스트 또는 이모지로 검색 (확장 검색어 적용)
            if (matchesAnyTerm(chipText) || Array.from(searchTerms).some(term => chipEmoji.includes(term))) {
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
  }, [supabase, replacements]);

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
