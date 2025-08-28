'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import DateInfoModal from './DateInfoModal';
import TopRibbon from './TopRibbon';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function startWeekday(y: number, m: number) {
  return new Date(y, m, 1).getDay(); // 0=Sun
}
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function prevOf({ y, m }: { y: number; m: number }) {
  return m ? { y, m: m - 1 } : { y: y - 1, m: 11 };
}
function nextOf({ y, m }: { y: number; m: number }) {
  return m < 11 ? { y, m: m + 1 } : { y: y + 1, m: 0 };
}
function cellKey(y: number, m: number, d: number) {
  return `${y}-${m}-${d}`;
}
const fmtUrl = (s: string) => (/^https?:\/\//i.test(s) ? s : `https://${s}`);

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const supabase = createClient();

  const today = useMemo(() => new Date(), []);
  const todayLabel = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())}`;

  const [ym, setYM] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [jump, setJump] = useState<string>(() => fmt(today.getFullYear(), today.getMonth(), today.getDate()));

  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<{ y: number; m: number; d: number } | null>(null);

  // ---- SWR 캐시 & 로딩 상태
  const [monthCache, setMonthCache] = useState<Map<string, any[]>>(new Map());
  const ymKey = `${ym.y}-${ym.m}`;
  const [loading, setLoading] = useState(false);

  // 해당 월의 노트 불러오기 (SWR: 캐시 즉시 → 백그라운드 갱신)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      // 1) 캐시가 있으면 즉시 표시(깜빡임 억제)
      const cached = monthCache.get(ymKey);
      if (cached) {
        const map: Record<string, Note> = {};
        cached.forEach((row: any) => {
          const n = normalizeNote(row);
          map[cellKey(n.y, n.m, n.d)] = n;
        });
        setNotes(map);
      }

      // 2) 최신 데이터로 갱신
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('y', ym.y)
          .eq('m', ym.m);

        if (!alive) return;
        if (error) {
          console.error(error.message);
          return;
        }

        const map: Record<string, Note> = {};
        (data || []).forEach((row: any) => {
          const n = normalizeNote(row);
          map[cellKey(n.y, n.m, n.d)] = n;
        });
        setNotes(map);
        setMonthCache((prev) => {
          const next = new Map(prev);
          next.set(ymKey, data || []);
          return next;
        });
      } catch (e) {
        if (alive) console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymKey]);

  async function prefetchMonth(y: number, m: number) {
    const k = `${y}-${m}`;
    if (monthCache.has(k)) return;
    const { data, error } = await supabase.from('notes').select('*').eq('y', y).eq('m', m);
    if (!error) {
      setMonthCache((prev) => {
        const next = new Map(prev);
        next.set(k, data || []);
        return next;
      });
    }
  }

  function openInfo(y: number, m: number, d: number) {
    setModalDate({ y, m, d });
    setModalOpen(true);
  }
  function onSaved(note: Note) {
    setNotes((prev) => ({ ...prev, [cellKey(note.y, note.m, note.d)]: note }));
  }

  // 프리셋 드롭 처리: 내용 입력이 비었으면 아이콘만 추가(emojiOnly)
  async function dropPreset(y: number, m: number, d: number, dataStr: string) {
    if (!canEdit) return;
    let payload: any;
    try {
      payload = JSON.parse(dataStr);
    } catch {
      return;
    }
    if (payload?.type !== 'preset') return;

    const preset = payload.preset as { emoji: string | null; label: string };

    const detail = window.prompt(
      `세부 내용을 입력하세요 (예: "${preset.emoji ?? ''} 맨시티 vs 리버풀 09:00")`,
      preset.emoji ? `${preset.emoji} ` : ''
    );
    const trimmed = (detail ?? '').trim();

    const newItem: Item = {
      emoji: preset.emoji ?? null,
      label: preset.label,
      text: trimmed.length ? trimmed : undefined,
      emojiOnly: trimmed.length ? false : true,
    };

    const k = cellKey(y, m, d);
    const cur = notes[k] || { y, m, d, content: '', items: [], color: null, link: null, image_url: null };
    const next: Note = { ...cur, items: [...(cur.items || []), newItem] };

    const { data, error } = await supabase.from('notes').upsert(next, { onConflict: 'y,m,d' }).select().single();
    if (error) { console.error('dropPreset upsert error:', error.message); return; }
    onSaved(data as any);
    openInfo(y, m, d);
  }

  // 월 그리드 생성
  const dim = daysInMonth(ym.y, ym.m);
  const start = startWeekday(ym.y, ym.m);
  const cells = useMemo(() => {
    const list: { y: number; m: number; d: number | null; w: number }[] = [];
    const total = Math.ceil((start + dim) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const d = i - start + 1;
      list.push({ y: ym.y, m: ym.m, d: d >= 1 && d <= dim ? d : null, w: i % 7 });
    }
    return list;
  }, [ym, dim, start]);

  const monthLabel = `${ym.y}.${pad(ym.m + 1)}`;

  const ribbonButtons = [
    { id: 'b1', src: '/ribbon/btn_chzzk.png', alt: '치지직', href: 'https://chzzk.naver.com/eaf7b569c9992d0e57db0059eb5c0eeb' },
    { id: 'b2', src: '/ribbon/btn_youtube.png', alt: '유튜브', href: 'https://www.youtube.com/channel/UC-711LHT7B6Lb1Xy5m_cjPw' },
    { id: 'b3', src: '/ribbon/btn_replay.png', alt: '다시보기', href: 'https://www.youtube.com/@eaglekopFulltime' },
    { id: 'b4', src: '/ribbon/btn_X.png', alt: 'X', href: 'https://x.com/eagle_kop' },
    { id: 'b5', src: '/ribbon/btn_discord.png', alt: '디스코드', href: 'https://discord.gg/sBSwch78bP' },
    { id: 'b6', src: '/ribbon/btn_fanCafe.png', alt: '팬카페', href: 'https://cafe.naver.com/eaglekoplockerroom' },
    { id: 'b7', src: '/ribbon/btn_fancim.png', alt: '팬심', href: 'https://fancim.me/celeb/profile.aspx?cu_id=eaglekop' },
    { id: 'b8', src: '/ribbon/btn_insta.png', alt: '인스타', href: 'https://www.instagram.com/eaglekop/' },
  ];

  async function jumpGo() {
    const d = new Date(jump);
    if (Number.isNaN(d.getTime())) {
      alert('유효한 날짜를 선택하세요.');
      return;
    }
    // 이동 전 미리 당겨오기
    await prefetchMonth(d.getFullYear(), d.getMonth());
    setYM({ y: d.getFullYear(), m: d.getMonth() });
    openInfo(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 칩 표시 문자열(emojiOnly 지원)
  function chipLabel(it: Item) {
    if (it.text && it.text.length) return it.text;
    if (it.emojiOnly) return it.emoji ? it.emoji : it.label;
    return `${it.emoji ? it.emoji + ' ' : ''}${it.label}`;
  }

  return (
    <>
      {/* ==================== 상단 컨테이너 (horizontal) ==================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 16,
          margin: '6px 0 14px',
        }}
      >
        {/* -------- 좌측 컨테이너 (vertical) -------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 360, flex: '1 1 60%' }}>
          {/* 좌측 상단: 아이콘 + 텍스트 (horizontal) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/images/channel-profile.png"
              alt="채널 프로필"
              width={40}
              height={40}
              style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }}
            />
            <h2 style={{ margin: 0 }}>이글콥의 스케쥴표</h2>
          </div>

          {/* 좌측 하단: ◀ 월 텍스트 ▶ | 날짜 선택 + 이동 (horizontal) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onMouseEnter={() => {
                const p = prevOf(ym);
                prefetchMonth(p.y, p.m);
              }}
              onClick={() => setYM(prevOf(ym))}
            >
              ◀
            </button>

            <strong style={{ fontSize: 18 }}>{monthLabel}</strong>

            <button
              onMouseEnter={() => {
                const n = nextOf(ym);
                prefetchMonth(n.y, n.m);
              }}
              onClick={() => setYM(nextOf(ym))}
            >
              ▶
            </button>

            <div className="jump">
              <input type="date" value={jump} onChange={(e) => setJump(e.target.value)} aria-label="날짜 선택" />
              <button
                onMouseEnter={() => {
                  const d = new Date(jump);
                  if (!Number.isNaN(d.getTime())) prefetchMonth(d.getFullYear(), d.getMonth());
                }}
                onClick={jumpGo}
              >
                이동
              </button>
            </div>
          </div>
        </div>

        {/* -------- 우측 컨테이너 (vertical) -------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 40%' }}>
          {/* 우측 상단: 오늘 날짜 크게 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 'clamp(20px, 4vw, 28px)',
                color: 'var(--accent)',
              }}
            >
              {todayLabel}
            </div>
          </div>

          {/* 우측 하단: Ribbon Buttons (horizontal) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <TopRibbon buttons={ribbonButtons} /*containerHeight={64}*/ gap={10} />
          </div>
        </div>
      </div>
      {/* ==================== /상단 컨테이너 ==================== */}

      {/* 요일/달력 그리드 (로딩 시 미세 페이드) */}
      <div className="grid grid-lg" style={{ opacity: loading ? 0.96 : 1, transition: 'opacity .12s linear' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((n, i) => (
          <div key={n} className={`day-name ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>
            {n}
          </div>
        ))}

        {cells.map((c, idx) => {
          const k = cellKey(c.y, c.m, c.d ?? -1);
          const note = c.d ? notes[k] : null;

          const isToday =
            !!c.d && c.y === today.getFullYear() && c.m === today.getMonth() && c.d === today.getDate();

          const flagClass = note?.color ? `flag-${note.color}` : '';
          const cn = `cell ${isToday ? 'today' : ''} ${c.w === 0 ? 'sun' : ''} ${c.w === 6 ? 'sat' : ''} ${flagClass}`.trim();

          // 메모가 있을 때만 플래그 배너(큰 흰색 텍스트) 표시. 메모가 없으면 칩을 그대로 노출.
          const showFlagBanner = !!note?.color && !!note?.content?.trim()?.length;
          const showChips = (note?.items?.length || 0) > 0 && !showFlagBanner;

          return (
            <div
              key={idx}
              className={cn}
              onClick={() => c.d && openInfo(c.y, c.m, c.d)}
              onDragOver={(e) => {
                if (canEdit && c.d) e.preventDefault();
              }}
              onDrop={(e) => {
                if (canEdit && c.d) {
                  e.preventDefault();
                  dropPreset(c.y, c.m, c.d, e.dataTransfer.getData('application/json'));
                }
              }}
            >
              {c.d && <div className="date date-lg">{c.d}</div>}

              {/* ▷ 하이퍼링크 아이콘 (우상단 / 링크 있을 때만) */}
              {!!note?.link && (
                <a
                  href={fmtUrl(note.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={note.link || undefined}
                  aria-label="하이퍼링크 열기"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    border: '1px solid #d0d7e2',
                    borderRadius: 999,
                    background: '#fff',
                    opacity: 0.9,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M10.59 13.41a2 2 0 0 1 0-2.82l3.18-3.18a2 2 0 1 1 2.83 2.83l-1.06 1.06"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13.41 10.59a2 2 0 0 1 0 2.82l-3.18 3.18a2 2 0 1 1-2.83-2.83l1.06-1.06"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
              )}

              {showFlagBanner && <div className="flag-banner">{note!.content}</div>}

              {(showChips && note) && (
                <div className="chips chips-scroll">
                  {note!.items.map((it: Item, i: number) => (
                    <span key={i} className="chip">
                      <span className="chip-emoji">{it.emoji ?? ''}</span>
                      <span className="chip-text">{it.text?.length ? it.text : it.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalDate && (
        <DateInfoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          date={modalDate}
          note={notes[cellKey(modalDate.y, modalDate.m, modalDate.d)] || null}
          canEdit={canEdit}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
