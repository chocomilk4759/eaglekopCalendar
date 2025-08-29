'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
const DAY_NAMES = ['일','월','화','수','목','금','토'];

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
  const supabase = useMemo(() => createClient(), []);

  const today = useMemo(() => new Date(), []);
  const todayLabel = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())}`;

  const [ym, setYM] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [jump, setJump] = useState<string>(() => fmt(today.getFullYear(), today.getMonth(), today.getDate()));

  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<{ y: number; m: number; d: number } | null>(null);
  const [presetToAdd, setPresetToAdd] = useState<{ emoji: string | null; label: string } | null>(null);
  // ---- SWR 캐시 & 로딩 상태
  const [monthCache, setMonthCache] = useState<Map<string, any[]>>(new Map());
  const ymKey = `${ym.y}-${ym.m}`;
  const [loading, setLoading] = useState(false);
  const [bgUrls, setBgUrls] = useState<Record<string, string>>({});
  // 그리드 칼럼 수 관찰 → 7칸 가능 여부
  const gridRef = useRef<HTMLDivElement>(null);
  const [canShowSeven, setCanShowSeven] = useState(true);
  const [cols, setCols] = useState(7);

  const lastDecisionRef = useRef<'seven'|'compact'>('seven');
  const pendingRef = useRef<'seven'|'compact'|null>(null);
  const tRef = useRef<number|undefined>(undefined);

  
  // ----- 롱프레스 드래그 상태 -----
  const [dragEnableKey, setDragEnableKey] = useState<string|null>(null);
  const [dragPulseKey, setDragPulseKey] = useState<string|null>(null); // ★ 펄스(반짝) 표시 대상 셀
  const pressTimerRef = useRef<number|undefined>(undefined);
  const pressKeyRef = useRef<string|null>(null);
  const pulseTimerRef = useRef<number|undefined>(undefined);           // ★ 펄스 자동 종료 타이머

  
  function triggerPulse(k: string) {
    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (isCoarse) return;                 // 터치 환경에서는 생략
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    setDragPulseKey(k);
    pulseTimerRef.current = window.setTimeout(() => {
      setDragPulseKey(null);
      pulseTimerRef.current = undefined;
    }, 200); // 0.2s 반짝
  }

  function clearPressTimer() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = undefined;
    }
    pressKeyRef.current = null;
  }

  function onPressStartCell(k: string) {
    clearPressTimer();
    pressKeyRef.current = k;
    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;
    const LONGPRESS_MS = isCoarse ? 550 : 350;
    pressTimerRef.current = window.setTimeout(() => {
      setDragEnableKey(k);
      triggerPulse(k);
    }, LONGPRESS_MS);
  }
  function onPressEndCell() {
    clearPressTimer();
    setDragPulseKey(null);
  }

  // 드래그 시작 시 데이터 적재
  function onCellDragStart(e: React.DragEvent<HTMLDivElement>, k: string, note: Note|undefined|null) {
    if (!note) { e.preventDefault(); return; }
    // 복제 페이로드(필요 필드만)
    const payload = {
      type: 'note-copy',
      note: {
        y: note.y, m: note.m, d: note.d,
        content: note.content ?? '',
        items: Array.isArray(note.items) ? note.items : [],
        color: note.color ?? null,
        link: note.link ?? null,
        image_url: note.image_url ?? null,
        title: (note as any)?.title ?? null,
        use_image_as_bg: (note as any)?.use_image_as_bg ?? false,
      }
    };
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'copy';
    } catch {}
  }
  function onCellDragEnd() {
    setDragEnableKey(null);
    clearPressTimer();
  }

  // 내용 존재 여부 판단
  function hasAnyContent(n?: Note|null) {
    if (!n) return false;
    if (n.content && n.content.trim().length) return true;
    if (Array.isArray(n.items) && n.items.length) return true;
    if (n.link) return true;
    if (n.image_url) return true;
    if (n.color) return true;
    if ((n as any)?.title) return true;
    return false;
  }

  // 병합 규칙: items = concat, content = 줄바꿈 병합, 그 외(링크/이미지/타이틀/색상)는 대상이 없으면 원본으로 채움
  function mergeNotes(src: Note, dst: Note): Note {
    const merged: Note = normalizeNote({
      ...dst,
      content: [dst.content || '', src.content || ''].filter(Boolean).join('\n'),
      items: [...(dst.items || []), ...(src.items || [])],
      link: dst.link ?? src.link ?? null,
      image_url: dst.image_url ?? src.image_url ?? null,
      color: dst.color ?? src.color ?? null,
      title: (dst as any)?.title ?? (src as any)?.title ?? null,
      use_image_as_bg: ((dst as any)?.use_image_as_bg ?? false) || ((src as any)?.use_image_as_bg ?? false),
    });
    return merged;
  }

  async function upsertNote(note: Note) {
    const payload = normalizeNote(note);
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict: 'y,m,d' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return normalizeNote(data as any);
  }

  // note 복제 드롭 처리
  async function dropNoteCopy(targetY:number, targetM:number, targetD:number, json: any) {
    if (!canEdit) return;
    if (!json || json.type !== 'note-copy' || !json.note) return;
    const src: Note = normalizeNote(json.note);
    if (src.y === targetY && src.m === targetM && src.d === targetD) return; // 동일 셀은 무시

    const k = cellKey(targetY, targetM, targetD);
    const dst = notes[k] || normalizeNote({ y: targetY, m: targetM, d: targetD, content:'', items:[], color:null, link:null, image_url:null });

    let finalNote: Note;
    if (hasAnyContent(dst)) {
      const ans = window.prompt('동작 선택: 1) 덮어쓰기  2) 합치기  3) 취소', '2');
      if (ans === '1') {
        finalNote = normalizeNote({ ...src, y: targetY, m: targetM, d: targetD });
      } else if (ans === '2') {
        finalNote = mergeNotes(src, normalizeNote({ ...dst, y: targetY, m: targetM, d: targetD }));
      } else {
        return; // 취소
      }
    } else {
      finalNote = normalizeNote({ ...src, y: targetY, m: targetM, d: targetD });
    }

    try {
      const saved = await upsertNote(finalNote);
      setNotes(prev => ({ ...prev, [cellKey(saved.y, saved.m, saved.d)]: saved }));
    } catch (e:any) {
      alert(e?.message ?? '복제 저장 중 오류');
    }
  }

  // grid 너비와 gap로 7칸 가능 여부 계산 (셀 최소폭 160px 기준)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cs = getComputedStyle(el);
      const gap = parseFloat(cs.columnGap || cs.gap || '12') || 12;
      const width = el.clientWidth;
      const cols = Math.floor((width + gap) / (140 + gap));
      setCanShowSeven(cols >= 7);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 7칸 불가 여부(data-compact)를 전역 속성으로만 전달
  useEffect(() => {
    const html = document.documentElement;
    const v = canShowSeven ? '0' : '1';
    // 불필요한 attribute 연속 갱신 방지
    if (html.getAttribute('data-compact') !== v) {
      html.setAttribute('data-compact', v);
    }
    return () => {
      html.removeAttribute('data-compact');
    };
  }, [canShowSeven]);

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

  function shallowEqualObj(a: Record<string,string>, b: Record<string,string>) {
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) if (a[k] !== b[k]) return false;
    return true;
  }

  function extractStoragePath(url: string): { bucket: string; key: string } | null {
    const m = url.match(/\/object\/(?:public|sign)\/([^/]+)\/([^?]+)(?:\?|$)/);
    if (!m) return null;
    return { bucket: m[1], key: decodeURIComponent(m[2]) };
  }
  const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);

// 배경 URL effect 의존성 축소 + setState 최적화
useEffect(() => {
  let cancelled = false;
  (async () => {
    const tasks: Array<Promise<[string, string]>> = [];
    for (const n of Object.values(notes)) {
      if (!n?.image_url || !(n as any)?.use_image_as_bg) continue;
      const k = `${n.y}-${n.m}-${n.d}`;
      const raw = n.image_url!;
      tasks.push((async () => {
        if (/^https?:\/\//i.test(raw)) {
          const m = raw.match(/\/object\/(?:public|sign)\/([^/]+)\/([^?]+)(?:\?|$)/);
          if (m) {
            const bucket = m[1], key = decodeURIComponent(m[2]);
            const { data } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
            return [k, data?.signedUrl || raw] as [string, string];
          }
          return [k, raw] as [string, string];
        } else {
          const { data } = await supabase.storage.from('note-images').createSignedUrl(raw, 3600);
          return [k, data?.signedUrl || ''] as [string, string];
        }
      })());
    }
    const settled = await Promise.allSettled(tasks);
    if (cancelled) return;
    const map: Record<string, string> = {};
    for (const r of settled) if (r.status === 'fulfilled') {
      const [k, u] = r.value; if (u) map[k] = u;
    }
    setBgUrls(prev => shallowEqualObj(prev, map) ? prev : map);
  })();
  return () => { cancelled = true; };
}, [notes, ymKey]);

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
    // 저장하지 않고, 해당 날짜 모달을 열고 프리셋을 전달한다.
    setPresetToAdd(preset);
    setModalDate({ y, m, d });
    setModalOpen(true);
  }

  // 월 그리드 생성
  const dim = daysInMonth(ym.y, ym.m);
  const start = startWeekday(ym.y, ym.m);
  const cells = useMemo(() => {
    const list: { y: number; m: number; d: number | null; w: number }[] = [];
    if (canShowSeven) {
      // 정확히 7열이 가능할 때: 주 단위로 정렬하기 위해 placeholder 포함
      const total = Math.ceil((start + dim) / 7) * 7;
      for (let i = 0; i < total; i++) {
        const d = i - start + 1;
        list.push({ y: ym.y, m: ym.m, d: d >= 1 && d <= dim ? d : null, w: i % 7 });
      }
    } else {
      // 7열 미만: 실제 날짜만 렌더(placeholder 제거 → 빈 칸이 공간을 차지하지 않음)
      for (let d = 1; d <= dim; d++) {
        list.push({ y: ym.y, m: ym.m, d, w: (start + d - 1) % 7 });
      }
    }
    return list;
  }, [ym, dim, start, canShowSeven]);

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

  // 셀 상단 중앙 타이틀:
  // - note.title 이 설정되어 있으면 그 값을 사용
  // - 설정하지 않으면 '', 7칸 미만일 때는 요일만 노출
  // - 7칸 미만 + title 존재 → "요일:타이틀"
  function cellTitleOf(note: Note | null | undefined, weekday: number, showWeekday: boolean) {
    const rawTitle = (((note as any)?.title) ?? '').trim();  // title 컬럼 사용
    if (!showWeekday) return rawTitle;
    const day = DAY_NAMES[weekday];
    return rawTitle ? `${day}:${rawTitle}` : day;
  }



  return (
    <>
      {/* ==================== 상단 컨테이너 (horizontal) ==================== */}
      <div
        className="calendar-top"
        style={{
          display: 'flex',
          flexDirection: canShowSeven ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 16,
          margin: '6px 0 14px',
        }}
      >
        {/* -------- 좌측 컨테이너 (vertical) -------- */}
        <div
          style={{
            display: 'flex',
            flexDirection: canShowSeven ? 'column' : 'row',
            gap: 10,
            minWidth: 360,
            flex: '1 1 60%'
          }}>
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
              <span style={{visibility:'hidden'}}>{todayLabel}</span>
            </div>
          </div>

          {/* 우측 하단: Ribbon Buttons (horizontal) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="top-ribbon-reset">
            <TopRibbon
              buttons={ribbonButtons}
              containerHeight={64}          // ★ 고정 높이 전달(컴포넌트가 지원)
              gap={10}
              key={canShowSeven ? 'wide' : 'narrow'}  // ★ 상태가 바뀔 때 리마운트
            />
          </div>
        </div>
      </div>
      {/* ==================== /상단 컨테이너 ==================== */}

      {/* 요일/달력 그리드 (로딩 시 미세 페이드) */}
      <div
        ref={gridRef}
        className={`grid calendar-grid ${canShowSeven ? 'seven' : 'auto'}`}
        style={{ opacity: loading ? 0.96 : 1, transition: 'opacity .12s linear' }}
      >
        {canShowSeven && ['일', '월', '화', '수', '목', '금', '토'].map((n, i) => (
          <div key={n} className={`day-name ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>{n}</div>
        ))}

        {cells.map((c, idx) => {
          const k = cellKey(c.y, c.m, c.d ?? -1);
          const note = c.d ? notes[k] : null;

          const isToday =
            !!c.d && c.y === today.getFullYear() && c.m === today.getMonth() && c.d === today.getDate();
          const bg = c.d ? bgUrls[k] : undefined; // 배경 URL

          const flagClass = note?.color ? `flag-${note.color}` : '';
          const cn = `cell ${isToday ? 'today' : ''} ${c.w === 0 ? 'sun' : ''} ${c.w === 6 ? 'sat' : ''} ${flagClass}`.trim();

          // 휴: color=red 이고 content가 '휴방'이면 휴 모드
          const isRest = !!note && note.color === 'red' && (note.content?.trim() === '휴방');
          // 메모(내용)는 배경색(color) 지정 + 휴가 아닐 때만 노출
          const showMemo = !!note?.color && !!note?.content?.trim()?.length && !isRest;
          const showChips = (note?.items?.length || 0) > 0 && !showMemo;

          return (
            <div
              key={idx}
              className={cn}
              draggable={canEdit && !!c.d && dragEnableKey === k}
              style={ bg ? {
                backgroundImage: `url(${bg})`,
                backgroundSize: '80% 80%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'transparent'
              } : undefined }
              onClick={() => c.d && openInfo(c.y, c.m, c.d)}
              onMouseDown={() => { if (canEdit && c.d) onPressStartCell(k); }}
              onMouseUp={onPressEndCell}
              onMouseLeave={onPressEndCell}
              onTouchStart={() => { if (canEdit && c.d) onPressStartCell(k); }}
              onTouchEnd={onPressEndCell}
              onDragStart={(e) => { if (canEdit && c.d && dragEnableKey === k) onCellDragStart(e, k, note || null); }}
              onDragEnd={onCellDragEnd}
              onDragOver={(e) => {
                if (canEdit && c.d) e.preventDefault();
              }}
              onDrop={(e) => {
                if (canEdit && c.d) {
                  e.preventDefault();
                  dropPreset(c.y, c.m, c.d, e.dataTransfer.getData('application/json'));
                  const raw = e.dataTransfer.getData('application/json');
                  try {
                    const json = JSON.parse(raw);
                    if (json?.type === 'note-copy') {
                      dropNoteCopy(c.y, c.m, c.d, json);
                    } else if (json?.type === 'preset') {
                      dropPreset(c.y, c.m, c.d, raw);
                    }
                  } catch {
                    // 무시
                  }
                }
              }}
            >
              <div
                className="cell-inner"
                role="group"
                aria-label="calendar cell"
                style={{ position: 'relative' }}  // 오버레이 기준 컨테이너
              >
                {/* 롱프레스 성립 순간에만 0.2s 펄스(PC 전용) */}
                {dragPulseKey === k && (
                  <div aria-hidden className="calendar-cell-pulse" />
                )}
                {/* ── 상단: 날짜 | {cell_title} | link ── */}
                <div className="cell-top">
                  <div className={`cell-date ${c.w==0?'sun': (c.w==6?'sat':'')}`}>{c.d ?? ''}</div>
                  <div className={`cell-title ${c.w===0?'sun': (c.w===6?'sat':'')}`}>
                    {cellTitleOf(note || null, c.w, !canShowSeven)}
                  </div>
                  <div className="cell-link">
                    {!!note?.link && (
                      <a
                        href={fmtUrl(note.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={note.link || undefined}
                        aria-label="하이퍼링크 열기"
                        onClick={(e) => e.stopPropagation()}
                        className="link-ico"
                        style={{ position: 'static' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                          <path d="M10.59 13.41a2 2 0 0 1 0-2.82l3.18-3.18a2 2 0 1 1 2.83 2.83l-1.06 1.06" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M13.41 10.59a2 2 0 0 1 0 2.82l-3.18 3.18a2 2 0 1 1-2.83-2.83l1.06-1.06" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* ── 콘텐츠: 휴(중앙 '휴방') > 플래그 메모(흰색 크게) > 칩 ── */}
                <div className={`cell-content ${(isRest || showMemo) ? 'has-text' : ''}`}>
                  {isRest ? (
                    <div className="cell-rest">휴방</div>
                  ) : showMemo ? (
                    <div className="cell-content-text">{note!.content}</div>
                  ) : (showChips && note) ? (
                    <div className="chips">
                      {note!.items.map((it: Item, i: number) => (
                        <span key={i} className="chip">
                          <span className="chip-emoji">{it.emoji ?? ''}</span>
                          <span className="chip-text">{it.text?.length ? it.text : it.label}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
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
          addChipPreset={presetToAdd}
          onConsumedAddPreset={() => setPresetToAdd(null)}
        />
      )}
    </>
  );
}
