'use client';

import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';
import ModifyChipInfoModal, { ChipPreset, ModifyChipMode } from './ModifyChipInfoModal';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import { isMobileDevice } from '@/lib/utils';

type Preset = { emoji: string | null; label: string };

const BUCKET = 'note-images';
const ALLOWED = ['image/png','image/jpeg','image/webp','image/gif','image/apng','image/avif'] as const;
const MAX_IMAGE_MB = 5;  // 일반 이미지 최대 크기
const MAX_GIF_MB = 10;   // GIF 최대 크기 (애니메이션 고려)

function derivePreviewPath(p: string)
{
  const i = p.lastIndexOf('.');
  const stem = i >= 0 ? p.slice(0, i) : p;
  return `${stem}-p.webp`;
}

// ✅ 전역 imageCache 사용으로 대체 (하위 호환성 유지)
async function signedUrl(supabase: ReturnType<typeof createClient>, path: string, ttlSec = 3600)
{
  const { getSignedUrl } = await import('@/lib/imageCache');
  return getSignedUrl(path, BUCKET, ttlSec);
}

// 프리뷰 먼저 보여주고, 백그라운드에서 원본 프리로드 후 교체
async function loadPreviewThenFull(
  supabase: ReturnType<typeof createClient>,
  path: string,
  setDisplay: (u: string|null)=>void
)
{
  const previewPath = derivePreviewPath(path);
  let preview = await signedUrl(supabase, previewPath, 3600);
  if (!preview) {
    // 프리뷰 없는 오래된 항목: 원본만 표시
    const full = await signedUrl(supabase, path, 3600);
    setDisplay(full);
    return;
  }
  setDisplay(preview);

  // 원본을 미리 로드하고 로드 완료 시 교체
  const full = await signedUrl(supabase, path, 3600);
  if (full) {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = full;
    img.onload = () => setDisplay(full);
  }
}

export default function DateInfoModal({
  open, onClose, date, note: initial, canEdit, onSaved, addChipPreset, onConsumedAddPreset
}:{
  open:boolean; onClose:()=>void;
  date:{y:number;m:number;d:number};
  note:Note|null;
  canEdit:boolean;
  onSaved:(n:Note)=>void;
  addChipPreset?: { emoji: string | null; label: string } | null;
  onConsumedAddPreset?: () => void;
}){
  const supabase = createClient();

  const emptyNote: Note = normalizeNote({
    y:date.y, m:date.m, d:date.d, content:'', items:[], color:null, link:null, image_url:null
  });

  const [note, setNote] = useState<Note>(initial || emptyNote);
  const [memo, setMemo] = useState(note.content || '');
  const [initialMemo, setInitialMemo] = useState(note.content || '');
  const [titleInput, setTitleInput] = useState<string>((note as any)?.title ?? '');
  const isRest = useMemo(
    () => note.color === 'red' && (note.content?.trim() === '휴방'),
    [note]
  );

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [linkInput, setLinkInput] = useState<string>(note.link ?? '');
  const [linkPanelOpen, setLinkPanelOpen] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(note.image_url ?? null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [useImageAsBg, setUseImageAsBg] = useState<boolean>(!!(note as any)?.use_image_as_bg);

  const [comboOpen, setComboOpen] = useState(false);
  const [chipModalOpen, setChipModalOpen] = useState(false);
  const [chipModalMode, setChipModalMode] = useState<ModifyChipMode>('add');
  const [chipModalPreset, setChipModalPreset] = useState<ChipPreset>({ emoji: null, label: '' });
  const [chipEditIndex, setChipEditIndex] = useState<number | null>(null);

  const [presets, setPresets] = useState<Preset[] | null>(null);
  const loadingPresetsRef = useRef(false);

  // ── 모달 이동/리사이즈 상태 ─────────────────────────────────────────────
  const [pos, setPos] = useState<{x:number;y:number}>({ x: 0, y: 0 });
  const [size, setSize] = useState<{w:number;h:number}>({ w: 720, h: 480 });
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{dx:number;dy:number;active:boolean}>({ dx:0, dy:0, active:false });
  const [limits, setLimits] = useState<{minW:number; minH:number; maxW:number; maxH:number; margin:number}>({ minW:420, minH:320, maxW:1100, maxH:900, margin:12 });
  const IMG_BASE_H = 175;
  const MODAL_BASE_H = 330;
  const imgBoxHeight = useMemo(() => Math.round(size.h * IMG_BASE_H / MODAL_BASE_H), [size.h]);
  const title = useMemo(
    () => `${date.y}-${String(date.m+1).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`,
    [date]
  );

  const disabled = !canEdit;

  // DateInfoModal.tsx 내 state 선언부 아래에 추가
  useEffect(() => {
    if (!open) return;
    if (!canEdit) return;
    if (!addChipPreset) return;
    setChipModalPreset({ emoji: addChipPreset.emoji ?? null, label: addChipPreset.label });
    setChipModalMode('add');
    setChipEditIndex(null);
    setChipModalStartTime('');
    setChipModalNextDay(false);
    setChipModalOpen(true);
    onConsumedAddPreset?.();
  }, [open, addChipPreset, canEdit]);


  // ── 이미지 URL 표시 (프리뷰 → 원본 교체) ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!imageUrl) { setDisplayImageUrl(null); return; }
      if (/^https?:\/\//i.test(imageUrl)) { setDisplayImageUrl(imageUrl); return; }

      await loadPreviewThenFull(supabase, imageUrl, (u) => {
        if (!cancelled) setDisplayImageUrl(u);
      });
    })();
    return () => { cancelled = true; };
  }, [imageUrl, supabase]);

  // ── 모달 열릴 때 초기화 + 중앙 배치 + 초기 크기 규칙(요구사항) ────────────
  useEffect(()=>{
    if (!open) return;
    const base = initial || emptyNote;
    setNote(base);
    setMemo(base.content || '');
    setInitialMemo(base.content || '');
    setTitleInput(((base as any)?.title ?? '') as string);
    setDragIndex(null);
    setLinkInput(base.link ?? '');
    setImageUrl(base.image_url ?? null);
    setDisplayImageUrl(null);
    setUseImageAsBg(!!(base as any)?.use_image_as_bg);
    setLinkPanelOpen(false);
    setComboOpen(false);

    const hasImg = !!base.image_url;
    const itemsCount = Array.isArray(base.items) ? base.items.length : 0;
    const isMobile = isMobileDevice();

    // 뷰포트에 따라 min/max 한계 재계산
    const L = computeLimits(hasImg);
    setLimits(L);
    // 원하는 기본 크기를 한계 내에서 보정
    const wantW = hasImg ? 880 : 550;
    // 콘텐츠에 따라 높이 자동 조정
    let wantH = 268; // 기본 최소 높이
    if (hasImg) {
      wantH = 330;
    } else {
      // 칩 개수와 메모 여부에 따라 조정
      if (itemsCount > 0) wantH += 20;
      // 모바일일 경우 추가 높이
      if (isMobile) wantH += 20;
    }
    const w = clamp(wantW, L.minW, L.maxW);
    const h = clamp(wantH, L.minH, L.maxH);
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = Math.max(L.margin, Math.floor((vw - w)/2));
    const y = Math.max(L.margin, Math.floor((vh - h)/2));
    setSize({ w, h }); setPos({ x, y });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // ── note prop이 변경되면 모달 내용 갱신 (칩 이동/복사 시) ────────────
  useEffect(() => {
    if (!open) return;
    if (!initial) return;
    // initial.id가 동일하지만 items가 변경된 경우 갱신
    const base = initial;
    setNote(base);
    setMemo(base.content || '');
    setTitleInput(((base as any)?.title ?? '') as string);
    setLinkInput(base.link ?? '');
    setImageUrl(base.image_url ?? null);
    setUseImageAsBg(!!(base as any)?.use_image_as_bg);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    
    function onResize() {
      const hasImg = !!(imageUrl || note.image_url);
      const L = computeLimits(hasImg);
      setLimits(L);
      setSize(prev => ({ w: clamp(prev.w, L.minW, L.maxW), h: clamp(prev.h, L.minH, L.maxH) }));
      setPos(prev => {
        const w = clamp(size.w, L.minW, L.maxW);
        const h = clamp(size.h, L.minH, L.maxH);
        const vw = window.innerWidth, vh = window.innerHeight;
        return {
          x: clamp(prev.x, L.margin, Math.max(L.margin, vw - w - L.margin)),
          y: clamp(prev.y, L.margin, Math.max(L.margin, vh - h - L.margin)),
        };
      });
    }

    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [open, imageUrl, note.image_url]);

  function computeLimits(hasImg:boolean){
    const margin = 12;
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(320, window.innerHeight);
    const baseMinW = hasImg ? 540 : 420;
    const baseMinH = hasImg ? 330 : 268; // 이미지 없으면 250px까지 줄일 수 있음
    const minW = Math.max(320, Math.min(baseMinW, vw - margin*2));
    const minH = Math.max(268, Math.min(baseMinH, vh - margin*2));
    const maxW = Math.max(minW, Math.min(1100, vw - margin*2));
    const maxH = Math.max(minH, Math.min(900, vh - margin*2));
    return { minW, minH, maxW, maxH, margin };
  }

  function clamp(n:number, lo:number, hi:number){ return Math.min(hi, Math.max(lo, n)); }

  function extractPathFromPublicUrl(url: string): string | null {
    const m = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = m[1];
    const path = m[2];
    if (bucket !== BUCKET) return null;
    return path;
  }

  async function fallbackToSignedUrlIfNeeded() {
    if (!imageUrl) return;
    if (!/^https?:\/\//i.test(imageUrl)) {
      const u = await signedUrl(supabase, imageUrl, 3600);
      if (u) setDisplayImageUrl(u);
      return;
    }
    const path = extractPathFromPublicUrl(imageUrl);
    if (path) {
      const u = await signedUrl(supabase, path, 3600);
      if (u) setDisplayImageUrl(u);
    }
  }

  async function persist(upd: Partial<Note> & Record<string, any>): Promise<Note> {
    const payload = normalizeNote({ ...note, ...upd, y: date.y, m: date.m, d: date.d });
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict: 'y,m,d' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const saved = normalizeNote(data as any);
    setNote(saved);
    onSaved(saved);
    return saved;
  }

  async function toggleFlag(color: 'red' | 'blue'){
    if(!canEdit) return;
    const next: 'red'|'blue'|null = note.color===color ? null : color;
    try{ await persist({ color: next }); }
    catch(e:any){ alert(e?.message ?? '플래그 저장 중 오류가 발생했습니다.'); }
  }

  async function toggleRest(){
    if(!canEdit) return;
    try{
      if (isRest) {
        await persist({ content: '', color: null });
      } else {
        await persist({ color: 'red', content: '휴방' });
      }
    }catch(e:any){
      alert(e?.message ?? '휴 상태 변경 중 오류');
    }
  }

  // 저장(메모+타이틀+이미지URL 유지)
  async function saveMemo(){
    if (!canEdit) return;
    try{
      const saved = await persist({
        content: memo,
        title: titleInput.trim() ? titleInput.trim() : null,
        image_url: imageUrl ?? null,
      });
      setInitialMemo(saved.content || '');
      alert('저장되었습니다.');
    }catch(e:any){
      alert(e?.message ?? '저장 중 오류가 발생했습니다.');
    }
  }

  async function toggleUseBg(checked: boolean) {
    if (!canEdit) return;
    setUseImageAsBg(checked);
    try { await persist({ use_image_as_bg: checked }); }
    catch (e:any) { alert(e?.message ?? '배경 사용 여부 저장 중 오류'); setUseImageAsBg(!checked); }
  }

  function openClearConfirm() {
    if (!canEdit) {
      setMemo('');
      return;
    }
    setConfirmAction(() => async () => {
      try {
        const { error } = await supabase.from('notes').delete()
          .eq('y', date.y).eq('m', date.m).eq('d', date.d);
        if (error) throw new Error(error.message);
        const cleared = normalizeNote({ ...emptyNote });
        setNote(cleared);
        setMemo('');
        setInitialMemo('');
        setLinkInput('');
        setImageUrl(null);
        setDisplayImageUrl(null);
        setLinkPanelOpen(false);
        setComboOpen(false);
        onSaved(cleared);
        setConfirmOpen(false);

        // 성공 알림 모달 표시
        setAlertMessage({ title: '초기화 완료', message: '해당 날짜의 모든 내용이 삭제되었습니다.' });
        setAlertOpen(true);
      } catch (e: any) {
        setConfirmOpen(false);
        // 오류 알림 모달 표시
        setAlertMessage({ title: '초기화 실패', message: e?.message ?? '초기화 중 오류가 발생했습니다.' });
        setAlertOpen(true);
      }
    });
    setConfirmOpen(true);
  }

  const [chipModalStartTime, setChipModalStartTime] = useState<string>('');
  const [chipModalNextDay, setChipModalNextDay] = useState<boolean>(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });

  function onDoubleClickChip(idx:number){
    if (!canEdit) return;
    const cur = note.items?.[idx]; if(!cur) return;
    setChipModalPreset({ emoji: cur.emoji ?? null, label: cur.label });
    setChipModalMode('edit');
    setChipEditIndex(idx);
    setChipModalStartTime(cur.startTime ?? '');
    setChipModalNextDay(cur.nextDay ?? false);
    setChipModalOpen(true);
  }

  async function applyAddChip(text: string, startTime: string, nextDay: boolean, overridePreset?: ChipPreset){
    if(!canEdit) return;
    const base = overridePreset ?? chipModalPreset;
    const newItem: Item = {
      emoji: base.emoji ?? null,
      label: base.label,
      text: text || undefined,
      emojiOnly: !text,
      startTime: startTime || undefined,
      nextDay: nextDay || undefined
    };
    const items = [...(note.items || []), newItem];
    try{ await persist({ items }); }
    catch(e:any){ alert(e?.message ?? '아이템 추가 중 오류'); }
    setChipModalOpen(false);
  }

  async function applyEditChip(text: string, startTime: string, nextDay: boolean, overridePreset?: ChipPreset){
    if(!canEdit || chipEditIndex==null) return;
    const items = [...(note.items || [])];
    const cur = items[chipEditIndex]; if(!cur) return;
    items[chipEditIndex] = {
      ...cur,
      text: text || undefined,
      emojiOnly: !text,
      emoji: (overridePreset?.emoji !== undefined) ? (overridePreset?.emoji ?? null) : cur.emoji,
      startTime: startTime || undefined,
      nextDay: nextDay || undefined
    };
    try{ await persist({ items }); }
    catch(e:any){ alert(e?.message ?? '아이템 수정 중 오류'); }
    setChipModalOpen(false);
  }

  async function deleteChip(){
    if(!canEdit || chipEditIndex==null) return;
    const ok = window.confirm('해당 아이템을 삭제할까요?'); if(!ok) return;
    const items = [...(note.items || [])]; items.splice(chipEditIndex, 1);
    try{ await persist({ items }); }
    catch(e:any){ alert(e?.message ?? '아이템 삭제 중 오류'); }
    setChipModalOpen(false);
  }

  function onDragStartChip(e:React.DragEvent<HTMLSpanElement>, idx:number){
    if(!canEdit) return;
    setDragIndex(idx);
    const item = note.items?.[idx];
    if (item) {
      // 칩을 Calendar 셀로 드래그할 수 있도록 payload 추가
      const payload = {
        type: 'chip',
        sourceType: 'modal',
        sourceDate: { y: date.y, m: date.m, d: date.d },
        chipIndex: idx,
        item
      };
      const payloadStr = JSON.stringify(payload);
      e.dataTransfer.setData('application/json', payloadStr);
      e.dataTransfer.setData('text/plain', payloadStr);
      // 모바일 fallback용으로 window 객체에 임시 저장
      (window as any).__draggedModalChip = payload;
    }
    e.dataTransfer.effectAllowed='move';
  }

  function onDragOverChip(e:React.DragEvent<HTMLSpanElement>){
    if(!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect='move';
  }
  async function onDropChip(e:React.DragEvent<HTMLSpanElement>, targetIdx:number){
    if(!canEdit) return;
    e.preventDefault();

    // dragIndex 우선 사용 (모달 내부 드래그)
    const from = dragIndex;
    if(from === null || from === targetIdx) return;

    const items = [...(note.items || [])];
    const [moved] = items.splice(from, 1);
    items.splice(targetIdx, 0, moved);

    // ✅ 낙관적 업데이트: 즉시 UI 반영
    setNote(prev => ({ ...prev, items }));
    setDragIndex(null);

    // 백그라운드에서 DB 저장
    try{
      await persist({ items });
    }
    catch(e:any){
      // 저장 실패 시 원래 상태로 롤백
      setNote(prev => ({ ...prev, items: note.items }));
      alert(e?.message ?? '순서 변경 중 오류');
    }
  }
  async function onDropContainer(e:React.DragEvent<HTMLDivElement>){
    if(!canEdit) return;
    e.preventDefault();

    // dragIndex 우선 사용 (모달 내부 드래그)
    const from = dragIndex;
    if(from === null) return;

    const items = [...(note.items || [])];
    const [moved] = items.splice(from, 1);
    items.push(moved);

    // ✅ 낙관적 업데이트: 즉시 UI 반영
    setNote(prev => ({ ...prev, items }));
    setDragIndex(null);

    // 백그라운드에서 DB 저장
    try{
      await persist({ items });
    }
    catch(e:any){
      // 저장 실패 시 원래 상태로 롤백
      setNote(prev => ({ ...prev, items: note.items }));
      alert(e?.message ?? '순서 변경 중 오류');
    }
  }

  const normUrl = (u: string) => {
    const s = (u || '').trim();
    return s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : '';
  };
  async function saveLink() {
    if (!canEdit) return;
    try {
      const normalized = linkInput ? normUrl(linkInput) : '';
      const saved = await persist({ link: normalized || null });
      setLinkInput(saved.link ?? '');
      alert('링크가 저장되었습니다.');
    } catch (e:any) { alert(e?.message ?? '링크 저장 중 오류'); }
  }
  async function deleteLink() {
    if (!canEdit) return;
    try { await persist({ link: null }); setLinkInput(''); }
    catch (e:any) { alert(e?.message ?? '링크 삭제 중 오류'); }
  }

  // 애니메이션 판별
  async function isWebpAnimated(file: File): Promise<boolean>
  {
    if (!(file.type === 'image/webp' || /\.webp$/i.test(file.name))) return false;
    const head = await file.slice(0, 512 * 1024).arrayBuffer();
    const s = new TextDecoder('ascii').decode(new Uint8Array(head));
    return s.includes('ANIM') || s.includes('ANMF');
  }

  // APNG 판별: PNG 파일 내 'acTL' 청크 존재 시 true
  async function isApngAnimated(file: File): Promise<boolean>
  {
    const looksPng = file.type === 'image/png' || file.type === 'image/apng' || /\.png$/i.test(file.name);
    if (!looksPng) return false;
    const head = await file.slice(0, 1024 * 1024).arrayBuffer(); // 앞부분만 스캔
    const s = new TextDecoder('ascii').decode(new Uint8Array(head));
    return s.includes('acTL'); // Animation Control Chunk
  }

  // ── 업로드(비GIF는 WebP 압축) ────────────────────────────────────────────
  async function compressToWebp(file: File, max = 1600, quality = 0.82): Promise<Blob> {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      const u = URL.createObjectURL(file);
      el.onload = () => { URL.revokeObjectURL(u); res(el); };
      el.onerror = (e) => { URL.revokeObjectURL(u); rej(e); };
      el.src = u;
    });
    const r = Math.min(max / img.width, max / img.height, 1);
    const w = Math.round(img.width * r), h = Math.round(img.height * r);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise((ok, rej) =>
      canvas.toBlob((b) => b ? ok(b) : rej(new Error('toBlob failed')), 'image/webp', quality)
    );

  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!canEdit) { alert('권한이 없습니다.'); e.currentTarget.value=''; return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { alert('로그인 필요'); setUploading(false); e.currentTarget.value=''; return; }

      if (!ALLOWED.includes(f.type as any)) {
        alert('이미지 형식은 PNG/JPEG/WebP/GIF/APNG/AVIF만 허용합니다.');
        setUploading(false); e.currentTarget.value=''; return;
      }

      const isGif = f.type === 'image/gif' || /\.gif$/i.test(f.name);
      const isAnimWebp = (f.type === 'image/webp' || /\.webp$/i.test(f.name)) ? await isWebpAnimated(f) : false;
      const isAnimApng = (f.type === 'image/png' || f.type === 'image/apng' || /\.png$/i.test(f.name)) ? await isApngAnimated(f) : false;
      const isAvif = f.type === 'image/avif' || /\.avif$/i.test(f.name); // 보수적으로 애니 가능성 고려

      // 파일 크기 검증: GIF는 별도 제한, 나머지는 일반 제한
      const maxSize = isGif ? MAX_GIF_MB : MAX_IMAGE_MB;
      if (f.size > maxSize * 1024 * 1024) {
        alert(`이미지 용량이 큽니다(>${maxSize}MB). 크기를 줄여 다시 시도하세요.`);
        setUploading(false);
        e.currentTarget.value = '';
        return;
      }

      // 업로드용 Blob / 확장자 / Content-Type 결정
      let blob: Blob;
      let ext: string;
      let contentType: string;

      if (isGif || isAnimWebp || isAnimApng || isAvif)
      {
        // 움직이는 이미지들은 원본 그대로 업로드(재생 보존)
        blob = f;
        // 확장자는 원본 유지
        if (isGif)      { ext = 'gif'; }
        else if (isAvif){ ext = 'avif'; }
        else if (isAnimWebp){ ext = 'webp'; }
        else /* APNG */ { ext = 'png'; }
        contentType = f.type || `image/${ext}`;
      }
      else
      {
        // 정적 이미지만 WebP로 리사이즈/압축
        blob = await compressToWebp(f, 1600, 0.82);
        ext = 'webp';
        contentType = 'image/webp';
      }

      const path = `${date.y}/${date.m + 1}/${date.d}/${Date.now()}.${ext}`;

      // 1) 원본 업로드
      const { error } = await supabase.storage.from(BUCKET)
        .upload(path, blob, { upsert: false, contentType });
      if (error) throw error;

      // 2) 프리뷰(WebP, max 640px) 생성 후 병행 업로드(실패해도 무시)
      try {
        const previewBlob = await compressToWebp(f, 640, 0.72);
        const previewPath = derivePreviewPath(path);
        await supabase.storage.from(BUCKET)
          .upload(previewPath, previewBlob, { upsert: false, contentType: 'image/webp' });
      } catch { /* 프리뷰 업로드 실패는 무시 */ }

      // 3) DB 저장 + 프리뷰부터 표시 후 원본으로 교체
      await persist({ image_url: path, use_image_as_bg: true });
      setImageUrl(path);
      await loadPreviewThenFull(supabase, path, (u) => setDisplayImageUrl(u));

    } catch (err:any) {
      alert(err?.message ?? '이미지 업로드 실패');
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  function openPicker(){ if(!canEdit) return; fileRef.current?.click(); }

  async function removeImage() {
    if (!canEdit) return;
    try {
      const saved = await persist({ image_url: null });
      setImageUrl(saved.image_url);
      setDisplayImageUrl(null);
    } catch (e:any) {
      alert(e?.message ?? '이미지 제거 중 오류');
    }
  }

  async function ensurePresets() {
    if (presets || loadingPresetsRef.current) return;
    loadingPresetsRef.current = true;
    try {
      const { data, error } = await supabase.from('presets').select('emoji,label');
      if (!error && data && Array.isArray(data) && data.length) {
        setPresets(data.map((r:any)=>({ emoji: r.emoji ?? null, label: String(r.label ?? '') })));
      } else {
        setPresets([
          { emoji: '📢', label: '공지' }, { emoji: '🔔', label: '알림' },
          { emoji: '⚽', label: '축구' }, { emoji: '⚾', label: '야구' },
          { emoji: '🏁', label: 'F1' },  { emoji: '🥎', label: '촌지' },
          { emoji: '🏆', label: '대회' }, { emoji: '🎮', label: '게임' },
          { emoji: '📺', label: '함께' }, { emoji: '🤼‍♂️', label: '합방' },
          { emoji: '👄', label: '저챗' }, { emoji: '🍚', label: '광고' },
          { emoji: '🎤', label: '노래' }, { emoji: '💙', label: '컨텐츠' },
        ]);
      }
    } catch {
      setPresets([
        { emoji: '📢', label: '공지' }, { emoji: '🔔', label: '알림' },
        { emoji: '⚽', label: '축구' }, { emoji: '⚾', label: '야구' },
        { emoji: '🏁', label: 'F1' },  { emoji: '🥎', label: '촌지' },
        { emoji: '🏆', label: '대회' }, { emoji: '🎮', label: '게임' },
        { emoji: '📺', label: '함께' }, { emoji: '🤼‍♂️', label: '합방' },
        { emoji: '👄', label: '저챗' }, { emoji: '🍚', label: '광고' },
        { emoji: '🎤', label: '노래' }, { emoji: '💙', label: '컨텐츠' },
      ]);
    } finally { loadingPresetsRef.current = false; }
  }
  
  async function addPresetItem(p: Preset) {
    if (!canEdit) return;
    const items = [...(note.items || [])];
    const newItem: Item = { emoji: p.emoji ?? null, label: p.label, emojiOnly: true };
    items.push(newItem);
    try { await persist({ items }); setComboOpen(false); }
    catch (e:any) { alert(e?.message ?? '아이템 추가 중 오류'); }
  }

  // ── 드래그 이동 핸들러 ───────────────────────────────────────────────────
  function onDragDown(e: React.MouseEvent) {
    const target = sheetRef.current;
    if (!target) return;
    dragRef.current.active = true;
    dragRef.current.dx = e.clientX - pos.x;
    dragRef.current.dy = e.clientY - pos.y;
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragUp, { once: true });
  }
  function onDragMove(e: MouseEvent) {
    if (!dragRef.current.active) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = Math.max(8, Math.min(e.clientX - dragRef.current.dx, vw - 40));
    const y = Math.max(8, Math.min(e.clientY - dragRef.current.dy, vh - 40));
    setPos({ x, y });
  }
  function onDragUp() {
    dragRef.current.active = false;
    window.removeEventListener('mousemove', onDragMove);
  }

  if(!open) return null;

  return (
    <div
      className="modal"
      onClick={onClose}
      style={{
        pointerEvents: 'none', // 모달 배경은 이벤트 통과
      }}
    >
      <div
        ref={sheetRef}
        className="sheet modal-draggable"
        style={{
          position:'absolute',
          left: pos.x, top: pos.y,
          width: size.w, height: size.h,
          minWidth: limits.minW, minHeight: limits.minH,
          maxWidth: limits.maxW, maxHeight: limits.maxH,
          resize:'both',
          overflow:'auto',
          pointerEvents: 'auto', // 모달 시트만 이벤트 받음
        }}
        onClick={(e)=>e.stopPropagation()}
      >
        {/* 상단(드래그 핸들) */}
        <div className="date-head drag-handle" onMouseDown={onDragDown} style={{cursor:'move', userSelect:'none'}}>
          <h3 style={{margin:'8px 0'}}>{title}</h3>
          <input
            type="text"
            value={titleInput}
            onChange={(e)=>setTitleInput(e.target.value)}
            placeholder="셀 타이틀"
            style={{
              marginLeft: 12,
              padding:'6px 8px',
              borderRadius:8,
              minWidth: 'min(160px, 40vw)',
              maxWidth: '100%',
              fontSize: 14,
            }}
            aria-label="셀 상단 타이틀"
            disabled={disabled}
          />

          <div className="flag-buttons" aria-label="날짜 강조 색상" style={{ userSelect:'none', display:'flex', alignItems:'center', gap:12 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
              <span style={{ opacity: disabled ? 0.5 : 1 }}>휴방</span>
              <input
                type="checkbox"
                checked={isRest}
                onChange={toggleRest}
                disabled={disabled}
                aria-label="휴방 설정"
                style={{ cursor: disabled ? 'not-allowed' : 'pointer', transform:'scale(1.2)' }}
              />
            </label>
            <button className={`flag-btn red ${note.color==='red'?'active':''}`}
                    onClick={()=>toggleFlag('red')}
                    title="빨간날" aria-label="빨간날로 표시"
                    disabled={disabled} />
            <button className={`flag-btn blue ${note.color==='blue'?'active':''}`}
                    onClick={()=>toggleFlag('blue')}
                    title="파란날" aria-label="파란날로 표시"
                    disabled={disabled} />
          </div>
        </div>

        {/* 칩 영역 */}
        {!isRest && ((note.items?.length || 0) === 0 ? (
          <div style={{opacity:.6,fontSize:13, marginBottom:6}}>
            아이템 없음
            <button
              onClick={async ()=>{ if(disabled) return; await ensurePresets(); setComboOpen(v=>!v); }}
              disabled={disabled}
              style={{ marginLeft:8, border:'1px dashed var(--border)', borderRadius:999, padding:'2px 10px' }}
              title="아이템 추가" aria-label="아이템 추가"
            >＋</button>
          </div>
        ) : (
          <div className="chips" style={{marginBottom:6, display:'flex', flexWrap:'wrap', gap:4}}
               onDragOver={(e)=>{ if(!disabled) e.preventDefault(); }}
               onDrop={(e)=>{ if(!disabled) onDropContainer(e); }}>
            {note.items.map((it:Item, idx:number)=>(
              <span key={idx} className="chip"
                    title={canEdit ? '더블클릭: 편집, 드래그: Calendar로 이동/복사 가능' : '보기 전용'}
                    onDoubleClick={()=> { if(!disabled) onDoubleClickChip(idx); }}
                    draggable={!disabled}
                    onDragStart={(e)=>{ if(!disabled) onDragStartChip(e, idx); }}
                    onDragOver={(e)=>{ if(!disabled) onDragOverChip(e); }}
                    onDrop={(e)=>{ if(!disabled) onDropChip(e, idx); }}
                    style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6,
                      border:'1px solid var(--border)', borderRadius:999, padding:'4px 10px',
                      fontSize:12, background:'var(--card)', color:'inherit',
                      ...(dragIndex===idx ? { opacity:.6 } : null)
                    }}>
                <span style={{display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2}}>
                  <span className="chip-emoji">{it.emoji ?? ''}</span>
                  {it.startTime && <span className="chip-time" style={{fontSize:11, opacity:0.7}}>{it.startTime}{it.nextDay ? '+1' : ''}</span>}
                </span>
                <span className="chip-text">{it.text?.length ? it.text : it.label}</span>
              </span>
            ))}
            <button
              onClick={async ()=>{ if(disabled) return; await ensurePresets(); setComboOpen(v=>!v); }}
              disabled={disabled}
              style={{ border:'1px dashed var(--border)', borderRadius:999, padding:'4px 10px',
                       background:'var(--card)', fontSize:12 }}
              title="아이템 추가" aria-label="아이템 추가"
            >＋</button>
          </div>
        ))}

        {comboOpen && presets && !disabled && (
          <div style={{ margin:'6px 0 4px' }}>
            <select
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (!Number.isNaN(idx) && presets[idx]) {
                  const p = presets[idx];
                  setComboOpen(false);
                  setChipModalPreset({ emoji: p.emoji ?? null, label: p.label });
                  setChipModalMode('add');
                  setChipEditIndex(null);
                  setChipModalStartTime('');
                  setChipModalNextDay(false);
                  setChipModalOpen(true);
                  e.currentTarget.selectedIndex = 0;
                }
              }}
              defaultValue=""
              aria-label="프리셋 선택"
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)' }}
              disabled={disabled}
            >
              <option value="" disabled>프리셋 선택…</option>
              {presets.map((p, i)=>(
                <option key={`${p.label}-${i}`} value={i}>{`${p.emoji ?? ''} ${p.label}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* [ 메모 | 이미지 ] */}
        <div style={{ display:'flex', alignItems:'stretch', gap:10, minHeight: 0 }}>
          <div style={{ flex:'1 1 0', minWidth:0 }}>
            {!isRest && (
              <textarea
                value={memo}
                onChange={(e)=>setMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                style={{width:'100%', minHeight:120, borderRadius:10, resize:'none'}}
                disabled={disabled}
              />
            )}

            {linkPanelOpen && (
              <div className="link-panel">
                <input
                  className="link-panel__input"
                  placeholder="https://example.com"
                  value={linkInput}
                  onChange={(e)=> setLinkInput(e.target.value)}
                  onBlur={()=> setLinkInput(s => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))}
                  disabled={disabled}
                />
                <div className="link-panel__actions">
                  <button type="button" className="btn-sm" onClick={saveLink} disabled={disabled}>링크 저장</button>
                  <button type="button" className="btn-sm btn-plain-danger" onClick={deleteLink} disabled={disabled}>링크 삭제</button>
                </div>
              </div>
            )}

            {/* 하단 버튼: [초기화] | [저장 | 이미지삽입, 이미지제거, 링크 | 닫기] */}
            <div className="actions actions--fixed" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:8 }}>
              <div className="actions-left" style={{ marginRight:'auto' }}>
                <button onClick={openClearConfirm} disabled={disabled} className="btn-plain-danger">초기화</button>
              </div>

              <div className="actions-right" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <button onClick={saveMemo} disabled={disabled}>저장</button>

                <span className="actions-sep" aria-hidden style={{ width:16, display:'inline-block' }} />

                <button onClick={openPicker} disabled={disabled || uploading}>
                  {uploading ? '업로드 중…' : '이미지 삽입'}
                </button>
                {imageUrl && <button onClick={removeImage} disabled={disabled}>이미지 제거</button>}
                <button
                  type="button"
                  onClick={()=> { if(disabled) return; setLinkPanelOpen(v=>!v); }}
                  aria-expanded={linkPanelOpen}
                  disabled={disabled}
                >
                  링크
                </button>

                <span className="actions-sep" aria-hidden style={{ width:16, display:'inline-block' }} />

                <button onClick={onClose}>닫기</button>
              </div>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={pickImage}
            hidden
          />

          {/* 이미지 프리뷰: 모달 크기에 반응. 기본 210x210 (CSS에서 설정) */}
          {displayImageUrl && (
            <div className="note-image-wrap">
              <div className="note-image-box" style={{ height: imgBoxHeight }}>
                <img
                  src={displayImageUrl ?? undefined}
                  alt="미리보기"
                  decoding="async"
                  loading="eager"
                  ref={(el) => { if (el) el.setAttribute('fetchpriority', 'high'); }}
                  onError={() => { fallbackToSignedUrlIfNeeded(); }}
                />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, fontSize:13 }}>
                <input type="checkbox" checked={useImageAsBg} onChange={(e)=> toggleUseBg(e.target.checked)} disabled={disabled || !imageUrl} />
                이미지를 배경으로 사용
              </label>
            </div>
          )}
        </div>

        {/* 칩 편집 모달 */}
        <ModifyChipInfoModal
          open={chipModalOpen}
          mode={chipModalMode}
          preset={chipModalPreset}
          initialText={chipModalMode==='edit' && chipEditIndex!=null ? (note.items[chipEditIndex]?.text ?? '') : ''}
          initialStartTime={chipModalStartTime}
          initialNextDay={chipModalNextDay}
          onSave={(t, st, nd, p)=> chipModalMode==='add' ? applyAddChip(t, st, nd, p) : applyEditChip(t, st, nd, p)}
          onDelete={chipModalMode==='edit' ? deleteChip : undefined}
          onClose={()=> setChipModalOpen(false)}
          canEdit={canEdit}
        />

        {/* 초기화 확인 모달 */}
        <ConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            if (confirmAction) confirmAction();
          }}
          title="초기화 확인"
          message="해당 날짜의 메모/아이템/색상/링크/이미지를 모두 삭제할까요?"
          confirmText="삭제"
          cancelText="취소"
        />

        {/* 알림 모달 */}
        <AlertModal
          open={alertOpen}
          onClose={() => setAlertOpen(false)}
          title={alertMessage.title}
          message={alertMessage.message}
        />
      </div>
    </div>
  );
}
