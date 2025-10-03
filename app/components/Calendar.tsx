'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import DateInfoModal from './DateInfoModal';
import TopRibbon from './TopRibbon';
import SearchModal from './SearchModal';
import ChipActionModal from './ChipActionModal';
import NoteActionModal from './NoteActionModal';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';
import ModifyChipInfoModal, { ChipPreset } from './ModifyChipInfoModal';
import { getHolidays, isHoliday, isSunday, type HolidayInfo } from '@/lib/holidayApi';

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
// 한국(서울) 기준 날짜 파츠
const SEOUL_TZ = 'Asia/Seoul';
function seoulParts(d = new Date())
{
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const [y, m, day] = f.format(d).split('-').map(Number);
  return { y, m: m - 1, d: day }; // m: 0~11
}

// 외부 링크 안전화
function safeUrl(raw: string | null | undefined): string | null
{
  if (!raw) return null;
  const s = raw.trim().replace(/[\u0000-\u001F\u007F]/g, '');
  if (/^(https?):\/\//i.test(s)) return s;
  if (/^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(s)) return `https://${s}`;
  return null; // 허용 스킴/도메인 패턴 아니면 링크 미노출
}

function lsKey(y:number, m:number) { return `cal:${y}-${m}`; }
function loadMonthLS(y:number, m:number): any[] | null
{
  try {
    const raw = localStorage.getItem(lsKey(y,m));
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}
function saveMonthLS(y:number, m:number, rows:any[]){ 
  try { localStorage.setItem(lsKey(y,m), JSON.stringify(rows||[])); } catch {}
}
function normMonth(y:number, m:number){ 
  // m 범위 보정(예: -1 -> 이전해 11월)
  const yy = y + Math.floor(m/12);
  const mm = ((m%12)+12)%12;
  return [yy, mm] as const;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const supabase = useMemo(() => createClient(), []);

  const todayParts = useMemo(() => seoulParts(new Date()), []);
  const todayLabel = `${todayParts.y}.${pad(todayParts.m + 1)}.${pad(todayParts.d)}`;

  const [ym, setYM] = useState({ y: todayParts.y, m: todayParts.m });
  const [jump, setJump] = useState<string>(() => fmt(todayParts.y, todayParts.m, todayParts.d));

  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<{ y: number; m: number; d: number } | null>(null);
  const [presetToAdd, setPresetToAdd] = useState<{ emoji: string | null; label: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // ---- SWR 캐시 & 로딩 상태
  const [monthCache, setMonthCache] = useState<Map<string, any[]>>(new Map());
  // ---- 공휴일 데이터
  const [holidays, setHolidays] = useState<Map<string, HolidayInfo>>(new Map());
  // 앱/캐시 버전이 바뀌면 month LS 캐시 무해화
  useEffect(() => {
    const VER = 'cal-cache-0.16.0';
    const cur = localStorage.getItem('cal:ver');
    if (cur !== VER) {
      // 배치로 키 목록 수집 후 동기적으로 삭제
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cal:') && k !== 'cal:ver') {
          keysToRemove.push(k);
        }
      }
      // 수집된 키를 한 번에 삭제
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('cal:ver', VER);
    }
  }, []);

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

  // ---------- 모바일 스와이프 (제거됨 - 드래그와 충돌) ----------
  // const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // ---------- Ctrl 다중 선택 ----------
  const [ctrlSelecting, setCtrlSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedKeysRef = useRef<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTargets, setBulkTargets] = useState<Array<{y:number;m:number;d:number}>>([]);

  // 칩 드롭 액션 모달 상태
  const [chipActionOpen, setChipActionOpen] = useState(false);
  const [pendingChipDrop, setPendingChipDrop] = useState<{
    targetY: number;
    targetM: number;
    targetD: number;
    sourceY: number;
    sourceM: number;
    sourceD: number;
    chipIndex: number;
    item: Item;
    sourceType: 'modal' | 'cell';
  } | null>(null);

  // 노트 복사 액션 모달 상태
  const [noteActionOpen, setNoteActionOpen] = useState(false);
  const [pendingNoteDrop, setPendingNoteDrop] = useState<{
    targetY: number;
    targetM: number;
    targetD: number;
    src: Note;
    dst: Note;
  } | null>(null);

  // 선택 날짜 타이틀(최대 5개 표시)
  function fmtBulkTitle(ts: Array<{y:number;m:number;d:number}>){
    if (!ts.length) return null;
    const parts = ts.slice().sort((a,b)=>a.y-b.y||a.m-b.m||a.d-b.d).map(t=>`${t.m+1}/${t.d}`);
    const head = parts.slice(0,5).join(', ');
    const more = parts.length>5 ? ` 외 ${parts.length-5}일` : '';
    return <>선택한 날짜: {head}{more}</>;
  }

  // Ctrl+F: 검색 모달 열기 (모든 사용자)
  useEffect(() => {
    function onSearchKey(e: KeyboardEvent){
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onSearchKey);
    return () => window.removeEventListener('keydown', onSearchKey);
  }, []);

  // 전역 키 리스너: Ctrl 누르면 선택 모드 시작, 떼면 모달 오픈 후 선택 초기화
  useEffect(() => {
    if (!canEdit) return;  // 권한 없으면 비활성화
    function onKeyDown(e: KeyboardEvent){
      if (e.key === 'Control' && !ctrlSelecting){
        setCtrlSelecting(true);
        selectedKeysRef.current = new Set();
        setSelectedKeys(new Set());
      }
    }
    function onKeyUp(e: KeyboardEvent){
      if (e.key === 'Control' && ctrlSelecting){
        const picked = Array.from(selectedKeysRef.current);
        if (picked.length){
          const targets = picked.map(k => { const [y,m,d]=k.split('-').map(Number); return {y,m,d}; });
          setBulkTargets(targets);
          setBulkOpen(true);
        }
        setCtrlSelecting(false);
        selectedKeysRef.current = new Set();
        setSelectedKeys(new Set());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [ctrlSelecting, canEdit]);

  // 공휴일 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const holidayMap = await getHolidays(ym.y, ym.m + 1);
      if (!cancelled) setHolidays(holidayMap);
    })();
    return () => { cancelled = true; };
  }, [ym.y, ym.m]);

  // 월 전환 시 선택 상태 초기화
  useEffect(() => {
    if(!canEdit) {
    setCtrlSelecting(false);
    selectedKeysRef.current = new Set();
    setSelectedKeys(new Set());
    }
  }, [canEdit]);

  // 스와이프 핸들러 (제거됨 - 드래그와 충돌)
  // function onTouchStart(e: React.TouchEvent) { ... }
  // function onTouchEnd(e: React.TouchEvent) { ... }

  // 셀 클릭: Ctrl-선택 토글 / 기본은 정보 모달 오픈
  function onCellClick(e: React.MouseEvent, y:number, m:number, d:number, key:string){
    if (ctrlSelecting && canEdit){
      e.preventDefault(); e.stopPropagation();
      const next = new Set(selectedKeysRef.current);
      next.has(key) ? next.delete(key) : next.add(key);
      selectedKeysRef.current = next;
      setSelectedKeys(new Set(next));
    } else {
      openInfo(y,m,d);
    }
  }

  // 일괄 칩 추가
  function applyBulkAddChip(text: string, startTime: string, nextDay: boolean, preset?: ChipPreset){
    const targets = bulkTargets.slice();
    if (!targets.length){ setBulkOpen(false); return; }
    setNotes(prev => {
      const next = { ...prev };
      for (const t of targets){
        const k = `${t.y}-${t.m}-${t.d}`;
        const n = next[k] ? { ...next[k] } : { y:t.y, m:t.m, d:t.d, content:'', items:[], color:null, link:null, image_url:null };
        const items = Array.isArray((n as any).items) ? [ ...(n as any).items ] : [];
        items.push({ text, emoji: preset?.emoji ?? null, label: preset?.label ?? '', startTime: startTime || undefined, nextDay: nextDay || undefined });
        (n as any).items = items;
        next[k] = n as any;
      }
      return next;
    });
    setBulkOpen(false);
    setBulkTargets([]);
  }
  
  // ★ Ctrl 일괄: '휴방' 적용(기존 휴방 로직과 동일하게 content='휴방', color='red')
  function applyBulkRest(){
    const targets = bulkTargets.slice();
    if (!targets.length){ setBulkOpen(false); return; }
    setNotes(prev => {
      const next = { ...prev };
      for (const t of targets){
        const k = `${t.y}-${t.m}-${t.d}`;
        const n = next[k] ? { ...next[k] } : { y:t.y, m:t.m, d:t.d, content:'', items:[], color:null, link:null, image_url:null };
        (n as any).content = '휴방';
        (n as any).color = 'red';
        next[k] = n as any;
      }
      return next;
    });
    setBulkOpen(false);
    setBulkTargets([]);
  }
  
  // ----- 롱프레스 드래그 상태 -----
  const [longReadyKey, setLongReadyKey] = useState<string|null>(null);
  const [dragPulseKey, setDragPulseKey] = useState<string|null>(null); // ★ 펄스(반짝) 표시 대상 셀
  const pressTimerRef = useRef<number|undefined>(undefined);
  const pressKeyRef = useRef<string|null>(null);
  const pulseTimerRef = useRef<number|undefined>(undefined);

  
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
    // 터치스크린 감지: 여러 방법 시도
    const isCoarse = window.matchMedia?.('(pointer: coarse)')?.matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = isCoarse || isTouchDevice;
    const LONGPRESS_MS = isMobile ? 200 : 350;

    pressTimerRef.current = window.setTimeout(() => {
      setLongReadyKey(k);
    }, LONGPRESS_MS);
  }
  function onPressEndCell() {
    clearPressTimer();
    setLongReadyKey(null);
  }



  // 드래그 시작 시 데이터 적재
  function onCellDragStart(e: React.DragEvent<HTMLDivElement>, k: string, note: Note|undefined|null) {
    if (longReadyKey !== k) { e.preventDefault(); return; }
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
    setLongReadyKey(null);
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

    if (hasAnyContent(dst)) {
      // 기존 내용이 있으면 모달 열기
      setPendingNoteDrop({
        targetY,
        targetM,
        targetD,
        src,
        dst,
      });
      setNoteActionOpen(true);
    } else {
      // 기존 내용 없으면 바로 복사
      const finalNote = normalizeNote({ ...src, y: targetY, m: targetM, d: targetD });
      try {
        const saved = await upsertNote(finalNote);
        setNotes(prev => ({ ...prev, [cellKey(saved.y, saved.m, saved.d)]: saved }));
      } catch (e:any) {
        alert(e?.message ?? '복제 저장 중 오류');
      }
    }
  }

  // 노트 덮어쓰기
  async function overwriteNote() {
    if (!pendingNoteDrop) return;
    const { targetY, targetM, targetD, src } = pendingNoteDrop;
    const finalNote = normalizeNote({ ...src, y: targetY, m: targetM, d: targetD });

    try {
      const saved = await upsertNote(finalNote);
      setNotes(prev => ({ ...prev, [cellKey(saved.y, saved.m, saved.d)]: saved }));
    } catch (e:any) {
      alert(e?.message ?? '덮어쓰기 중 오류');
    }

    setNoteActionOpen(false);
    setPendingNoteDrop(null);
  }

  // 노트 합치기
  async function mergeNote() {
    if (!pendingNoteDrop) return;
    const { targetY, targetM, targetD, src, dst } = pendingNoteDrop;
    const finalNote = mergeNotes(src, normalizeNote({ ...dst, y: targetY, m: targetM, d: targetD }));

    try {
      const saved = await upsertNote(finalNote);
      setNotes(prev => ({ ...prev, [cellKey(saved.y, saved.m, saved.d)]: saved }));
    } catch (e:any) {
      alert(e?.message ?? '합치기 중 오류');
    }

    setNoteActionOpen(false);
    setPendingNoteDrop(null);
  }

  // 노트 이동 (원본 삭제)
  async function moveNote() {
    if (!pendingNoteDrop) return;
    const { targetY, targetM, targetD, src } = pendingNoteDrop;
    const finalNote = normalizeNote({ ...src, y: targetY, m: targetM, d: targetD });

    try {
      // 대상에 저장
      const saved = await upsertNote(finalNote);

      // 원본 삭제
      const { error } = await supabase.from('notes').delete()
        .eq('y', src.y).eq('m', src.m).eq('d', src.d);
      if (error) throw new Error(error.message);

      // 상태 업데이트
      const sourceKey = cellKey(src.y, src.m, src.d);
      const targetKey = cellKey(saved.y, saved.m, saved.d);

      setNotes(prev => {
        const next = { ...prev };
        delete next[sourceKey]; // 원본 삭제
        next[targetKey] = saved; // 대상 설정
        return next;
      });
    } catch (e:any) {
      alert(e?.message ?? '이동 중 오류');
    }

    setNoteActionOpen(false);
    setPendingNoteDrop(null);
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
      // 1) 캐시가 있으면 즉시 표시 → 없으면 로컬스토리지 폴백
      const cached = monthCache.get(ymKey) || loadMonthLS(ym.y, ym.m);
      if (cached) {
        const map: Record<string, Note> = {};
        (cached as any[]).forEach((row: any) => {
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
          .select('y,m,d,content,items,color,link,image_url,title,use_image_as_bg')
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
        saveMonthLS(ym.y, ym.m, data || []);
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

// 배경 URL effect 의존성 축소 + setState 최적화 + 캐싱 강화
useEffect(() => {
  let cancelled = false;
  (async () => {
    // 동적 import로 imageCache 로드
    const { getSignedUrl } = await import('@/lib/imageCache');

    const tasks: Array<Promise<[string, string]>> = [];
    for (const n of Object.values(notes)) {
      if (!n?.image_url || !(n as any)?.use_image_as_bg) continue;
      const k = `${n.y}-${n.m}-${n.d}`;
      const raw = n.image_url!;

      tasks.push((async () => {
        // HTTP URL이면 그대로 사용 (외부 이미지)
        if (/^https?:\/\//i.test(raw)) {
          const m = raw.match(/\/object\/(?:public|sign)\/([^/]+)\/([^?]+)(?:\?|$)/);
          if (m) {
            const bucket = m[1], key = decodeURIComponent(m[2]);
            // 캐싱된 getSignedUrl 사용
            const url = await getSignedUrl(key, bucket);
            return [k, url || raw] as [string, string];
          }
          return [k, raw] as [string, string];
        } else {
          // 상대 경로는 note-images 버킷
          const url = await getSignedUrl(raw, 'note-images');
          return [k, url || ''] as [string, string];
        }
      })());
    }

    const settled = await Promise.allSettled(tasks);
    if (cancelled) return;

    const map: Record<string, string> = {};
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        const [k, u] = r.value;
        if (u) map[k] = u;
      }
    }

    setBgUrls(prev => shallowEqualObj(prev, map) ? prev : map);
  })();
  return () => { cancelled = true; };
}, [notes, ymKey]);

  async function prefetchMonth(y: number, m: number) {
    const k = `${y}-${m}`;
    if (monthCache.has(k) || loadMonthLS(y, m)) return;

    const { data, error } = await supabase
      .from('notes')
      .select('y,m,d,content,items,color,link,image_url,title,use_image_as_bg')
      .eq('y', y).eq('m', m);

    if (!error) {
      setMonthCache((prev) => {
        const next = new Map(prev);
        next.set(k, data || []);
        return next;
      });
      saveMonthLS(y, m, data || []); // ← 누락 보완

      // 백그라운드로 이전/다음 달 미리 가져오기
      (async () => {
        for (const [yy, mm0] of [[ym.y, ym.m-1], [ym.y, ym.m+1]]) {
          const [ny, nm] = normMonth(yy, mm0);
          const k = `${ny}-${nm}`;
          if (monthCache.get(k) || loadMonthLS(ny, nm)) continue;
          try {
            const { data: nb } = await supabase
              .from('notes')
              .select('y,m,d,content,items,color,link,image_url,title,use_image_as_bg')
              .eq('y', ny).eq('m', nm);
            if (nb) {
              setMonthCache((prev) => { const next = new Map(prev); next.set(k, nb); return next; });
              saveMonthLS(ny, nm, nb);
            }
          } catch {}
        }
      })();
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

  // 칩 드롭 처리
  async function dropChip(targetY: number, targetM: number, targetD: number, dataStr: string) {
    if (!canEdit) return;
    let payload: any;
    try {
      payload = JSON.parse(dataStr);
    } catch {
      return;
    }
    if (payload?.type !== 'chip') return;

    const { sourceDate, chipIndex, item, sourceType } = payload;

    // 동일 날짜로 드롭하면 무시
    if (sourceDate.y === targetY && sourceDate.m === targetM && sourceDate.d === targetD) return;

    // 모달 열어서 이동/복사 선택
    setPendingChipDrop({
      targetY,
      targetM,
      targetD,
      sourceY: sourceDate.y,
      sourceM: sourceDate.m,
      sourceD: sourceDate.d,
      chipIndex,
      item,
      sourceType,
    });
    setChipActionOpen(true);
  }

  // 칩 이동 (원본 삭제)
  async function moveChip() {
    if (!pendingChipDrop) return;
    const { targetY, targetM, targetD, sourceY, sourceM, sourceD, chipIndex, item } = pendingChipDrop;

    // 1) 대상 날짜에 칩 추가
    const targetKey = cellKey(targetY, targetM, targetD);
    const targetNote = notes[targetKey] || normalizeNote({
      y: targetY, m: targetM, d: targetD, content: '', items: [], color: null, link: null, image_url: null
    });
    const targetItems = [...(targetNote.items || []), item];

    // 2) 원본 날짜에서 칩 제거
    const sourceKey = cellKey(sourceY, sourceM, sourceD);
    const sourceNote = notes[sourceKey];
    if (!sourceNote) return;
    const sourceItems = [...(sourceNote.items || [])];
    sourceItems.splice(chipIndex, 1);

    try {
      // 대상 저장
      await upsertNote({ ...targetNote, items: targetItems });
      // 원본 저장
      await upsertNote({ ...sourceNote, items: sourceItems });

      // 상태 업데이트
      setNotes(prev => ({
        ...prev,
        [targetKey]: { ...targetNote, items: targetItems },
        [sourceKey]: { ...sourceNote, items: sourceItems },
      }));
    } catch (e: any) {
      alert(e?.message ?? '칩 이동 중 오류');
    }

    setChipActionOpen(false);
    setPendingChipDrop(null);
  }

  // 칩 복사 (원본 유지)
  async function copyChip() {
    if (!pendingChipDrop) return;
    const { targetY, targetM, targetD, item } = pendingChipDrop;

    const targetKey = cellKey(targetY, targetM, targetD);
    const targetNote = notes[targetKey] || normalizeNote({
      y: targetY, m: targetM, d: targetD, content: '', items: [], color: null, link: null, image_url: null
    });
    const targetItems = [...(targetNote.items || []), item];

    try {
      await upsertNote({ ...targetNote, items: targetItems });
      setNotes(prev => ({
        ...prev,
        [targetKey]: { ...targetNote, items: targetItems },
      }));
    } catch (e: any) {
      alert(e?.message ?? '칩 복사 중 오류');
    }

    setChipActionOpen(false);
    setPendingChipDrop(null);
  }

  // 월 그리드 생성 (최적화: 의존성 최소화)
  const dim = useMemo(() => daysInMonth(ym.y, ym.m), [ym.y, ym.m]);
  const start = useMemo(() => startWeekday(ym.y, ym.m), [ym.y, ym.m]);
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
  }, [ym.y, ym.m, dim, start, canShowSeven]);

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

    const y = d.getFullYear();
    const m = d.getMonth();

    // 현재 월과 다르면 데이터 로드 후 월 변경
    if (ym.y !== y || ym.m !== m) {
      const k = `${y}-${m}`;
      let cached = monthCache.get(k) || loadMonthLS(y, m);

      // 캐시에 없으면 서버에서 가져오기
      if (!cached) {
        const { data, error } = await supabase
          .from('notes')
          .select('y,m,d,content,items,color,link,image_url,title,use_image_as_bg')
          .eq('y', y).eq('m', m);

        if (!error && data) {
          cached = data;
          setMonthCache((prev) => {
            const next = new Map(prev);
            next.set(k, data);
            return next;
          });
          saveMonthLS(y, m, data);
        }
      }

      // notes 상태 업데이트
      if (cached) {
        const map: Record<string, Note> = {};
        (cached as any[]).forEach((row: any) => {
          const n = normalizeNote(row);
          map[cellKey(n.y, n.m, n.d)] = n;
        });
        setNotes(map);
      }

      setYM({ y, m });
    }

    openInfo(y, m, d.getDate());
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
  // - 공휴일이면 공휴일명 추가
  function cellTitleOf(note: Note | null | undefined, weekday: number, showWeekday: boolean, y: number, m: number, d: number) {
    const rawTitle = (((note as any)?.title) ?? '').trim();  // title 컬럼 사용
    const holiday = isHoliday(y, m, d, holidays);

    if (!showWeekday) {
      // 7칸 모드: 공휴일명 또는 타이틀
      return holiday ? holiday.dateName : rawTitle;
    }

    const day = DAY_NAMES[weekday];
    if (holiday) {
      // 공휴일이 있으면 요일:공휴일명 형식
      return `${day}:${holiday.dateName}`;
    }
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

            <div className="jump" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
              <input type="date" value={jump} onChange={(e) => setJump(e.target.value)} aria-label="날짜 선택" />
              <button
                onMouseEnter={() => {
                  const d = new Date(jump);
                  if (!Number.isNaN(d.getTime())) prefetchMonth(d.getFullYear(), d.getMonth());
                }}
                onClick={jumpGo}
                title="이동"
                aria-label="이동"
              >
                ➜
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                title="검색 (Ctrl+F)"
                aria-label="검색"
              >
                🔍
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

      {/* 스켈레톤 UI (로딩 중) */}
      {loading && (
        <div className={`grid calendar-grid ${canShowSeven ? 'seven' : 'auto'} skeleton-grid`}>
          {canShowSeven && ['일', '월', '화', '수', '목', '금', '토'].map((n, i) => (
            <div key={n} className={`day-name ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>{n}</div>
          ))}
          {Array.from({ length: canShowSeven ? 35 : 31 }).map((_, idx) => (
            <div key={idx} className="cell skeleton-cell">
              <div className="skeleton-date"></div>
              <div className="skeleton-chips">
                <div className="skeleton-chip"></div>
                <div className="skeleton-chip"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 요일/달력 그리드 */}
      <div
        ref={gridRef}
        className={`grid calendar-grid ${canShowSeven ? 'seven' : 'auto'}`}
        style={{
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          position: loading ? 'absolute' : 'relative',
          visibility: loading ? 'hidden' : 'visible'
        }}
      >
        {canShowSeven && ['일', '월', '화', '수', '목', '금', '토'].map((n, i) => (
          <div key={n} className={`day-name ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>{n}</div>
        ))}

        {cells.map((c, idx) => {
          const k = cellKey(c.y, c.m, c.d ?? -1);
          const note = c.d ? notes[k] : null;

          const isToday = !!c.d && c.y === todayParts.y && c.m === todayParts.m && c.d === todayParts.d;

          const bg = c.d ? bgUrls[k] : undefined; // 배경 URL
          const baseBgColor =
            note?.color === 'red' ? 'var(--flagRed)' :
            note?.color === 'blue' ? 'var(--flagBlue)' : 'var(--card)';
          const flagClass = note?.color ? `flag-${note.color}` : '';
          const cn = `cell ${isToday ? 'today' : ''} ${c.w === 0 ? 'sun' : ''} ${c.w === 6 ? 'sat' : ''} ${flagClass} ${bg ? 'has-bgimg' : ''}`.trim();

          // 휴: color=red 이고 content가 '휴방'이면 휴 모드
          const isRest = !!note && note.color === 'red' && (note.content?.trim() === '휴방');

          // 파란 셀에서 "칩 + 텍스트"를 함께 보여주기 위한 분기
          const hasItems = (note?.items?.length || 0) > 0;
          const hasText  = !!note?.content?.trim()?.length;
          const isBlue   = note?.color === 'blue';
          const showBundle = !!note && isBlue && hasItems && hasText && !isRest;

          // 기존 규칙은 유지하되, 번들일 땐 showMemo가 단독으로 칩을 가리지 않도록 제외
          const showMemo  = !!note?.color && hasText && !isRest && !showBundle;
          const showChips = hasItems && (!showMemo || showBundle);
          const isPicked = selectedKeys.has(k);
          const linkUrl = safeUrl(note?.link ?? null);
          const linkTitle = note?.link ?? undefined;
          return (
            <div
              key={idx}
              className={`${cn} ${isPicked ? 'sel' : ''}`}
              data-cell-key={k}
              draggable={canEdit && !!c.d }
              style={ bg ? {
                backgroundImage: `url(${bg})`,
                backgroundSize: '80% 80%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: baseBgColor
              } : undefined }
              onClick={(e) => c.d && onCellClick(e, c.y, c.m, c.d, k)}
              onMouseDown={(e) => {
                // 칩을 클릭한 경우 셀 드래그 무시
                if ((e.target as HTMLElement).closest('.chip')) return;
                if (canEdit && c.d) onPressStartCell(k);
              }}
              onMouseUp={onPressEndCell}
              onMouseLeave={onPressEndCell}
              onDragStart={(e) => { if (canEdit && c.d) onCellDragStart(e, k, note || null); }}
              onDragEnd={onCellDragEnd}
              onDragOver={(e) => {
                if (canEdit && c.d) e.preventDefault();
              }}
              onDrop={(e) => {
                if (canEdit && c.d) {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData('application/json');
                  try {
                    const json = JSON.parse(raw);
                    if (json?.type === 'note-copy') {
                      // 노트 복제 드롭
                      dropNoteCopy(c.y, c.m, c.d, json);
                    } else if (json?.type === 'preset') {
                      // 프리셋 드롭 → 모달 오픈
                      dropPreset(c.y, c.m, c.d, raw);
                    } else if (json?.type === 'chip') {
                      // 칩 드롭 → 이동/복사 선택 모달
                      dropChip(c.y, c.m, c.d, raw);
                    } else {
                      // 다른 타입은 무시
                    }
                  } catch {
                    // 파싱 실패 시 무시
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
                  <div className={`cell-title ${(c.w===0 || (c.d && isHoliday(c.y, c.m, c.d, holidays)))?'sun': (c.w===6?'sat':'')}`}>
                    {c.d ? cellTitleOf(note || null, c.w, !canShowSeven, c.y, c.m, c.d) : ''}
                  </div>
                  <div className="cell-link">
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={linkTitle}
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

                {/* ── 콘텐츠: 휴(중앙 '휴방') > 파란 셀 번들(칩+텍스트) > 플래그 메모 단독 > 칩 단독 ── */}
                <div className={`cell-content ${(isRest || (showMemo && !showBundle)) ? 'has-text' : ''}`}>
                  {isRest ? (
                    <div className="cell-rest">휴방</div>
                  ) : showBundle && note ? (
                    // 파란 셀에서 칩을 먼저, 텍스트를 아래에
                    <div className="cell-bundle">
                      <div className="chips">
                        {note.items.map((it: Item, i: number) => (
                          <span
                            key={i}
                            className="chip"
                            draggable={canEdit}
                            onDragStart={(e) => {
                              if (!canEdit || !c.d) return;
                              e.stopPropagation();
                              const payload = {
                                type: 'chip',
                                sourceType: 'cell',
                                sourceDate: { y: c.y, m: c.m, d: c.d },
                                chipIndex: i,
                                item: it
                              };
                              e.dataTransfer.setData('application/json', JSON.stringify(payload));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            <span style={{display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2}}>
                              <span className="chip-emoji">{it.emoji ?? ''}</span>
                              {it.startTime && <span className="chip-time">{it.startTime}{it.nextDay ? '+1' : ''}</span>}
                            </span>
                            <span className="chip-text">{it.text?.length ? it.text : it.label}</span>
                          </span>
                        ))}
                      </div>
                      <div className="cell-content-text">{note.content}</div>
                    </div>
                  ) : showMemo ? (
                    <div className="cell-content-text">{note!.content}</div>
                  ) : (showChips && note) ? (
                    <div className="chips">
                      {note!.items.map((it: Item, i: number) => (
                        <span
                          key={i}
                          className="chip"
                          draggable={canEdit}
                          onDragStart={(e) => {
                            if (!canEdit || !c.d) return;
                            e.stopPropagation();
                            const payload = {
                              type: 'chip',
                              sourceType: 'cell',
                              sourceDate: { y: c.y, m: c.m, d: c.d },
                              chipIndex: i,
                              item: it
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(payload));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          style={{
                            opacity: 1,
                          }}
                        >
                          <span style={{display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2}}>
                            <span className="chip-emoji">{it.emoji ?? ''}</span>
                            {it.startTime && <span className="chip-time">{it.startTime}{it.nextDay ? '+1' : ''}</span>}
                          </span>
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

      {/* ── Ctrl 선택 → 일괄 칩 추가 모달 ── */}
      <ModifyChipInfoModal
        open={bulkOpen}
        mode="add"
        preset={{ emoji: null, label: '' }}
        initialText=""
        onSave={(t,st,nd,p)=> applyBulkAddChip(t,st,nd,p)}
        onClose={()=> setBulkOpen(false)}
        canEdit={canEdit}
        title={fmtBulkTitle(bulkTargets)}
        onRest={applyBulkRest}
        showRestButton={true}
      />

      {/* ── 검색 모달 (Ctrl+F) ── */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        notes={notes}
        onSelectDate={async (y, m, d) => {
          // 현재 월과 다르면 데이터 로드 후 월 변경
          if (ym.y !== y || ym.m !== m) {
            const k = `${y}-${m}`;
            let cached = monthCache.get(k) || loadMonthLS(y, m);

            // 캐시에 없으면 서버에서 가져오기
            if (!cached) {
              const { data, error } = await supabase
                .from('notes')
                .select('y,m,d,content,items,color,link,image_url,title,use_image_as_bg')
                .eq('y', y).eq('m', m);

              if (!error && data) {
                cached = data;
                setMonthCache((prev) => {
                  const next = new Map(prev);
                  next.set(k, data);
                  return next;
                });
                saveMonthLS(y, m, data);
              }
            }

            // notes 상태 업데이트
            if (cached) {
              const map: Record<string, Note> = {};
              (cached as any[]).forEach((row: any) => {
                const n = normalizeNote(row);
                map[cellKey(n.y, n.m, n.d)] = n;
              });
              setNotes(map);
            }

            setYM({ y, m });
          }
          openInfo(y, m, d);
        }}
      />

      {/* ── 칩 이동/복사 선택 모달 ── */}
      <ChipActionModal
        open={chipActionOpen}
        onClose={() => {
          setChipActionOpen(false);
          setPendingChipDrop(null);
        }}
        onMove={moveChip}
        onCopy={copyChip}
        chipLabel={pendingChipDrop?.item ? `${pendingChipDrop.item.emoji ?? ''} ${pendingChipDrop.item.text || pendingChipDrop.item.label}` : ''}
      />

      {/* ── 노트 이동/덮어쓰기/합치기 선택 모달 ── */}
      <NoteActionModal
        open={noteActionOpen}
        onClose={() => {
          setNoteActionOpen(false);
          setPendingNoteDrop(null);
        }}
        onMove={moveNote}
        onOverwrite={overwriteNote}
        onMerge={mergeNote}
        sourceDate={pendingNoteDrop ? `${pendingNoteDrop.src.y}-${String(pendingNoteDrop.src.m + 1).padStart(2, '0')}-${String(pendingNoteDrop.src.d).padStart(2, '0')}` : ''}
        targetDate={pendingNoteDrop ? `${pendingNoteDrop.targetY}-${String(pendingNoteDrop.targetM + 1).padStart(2, '0')}-${String(pendingNoteDrop.targetD).padStart(2, '0')}` : ''}
      />
    </>
  );
}
