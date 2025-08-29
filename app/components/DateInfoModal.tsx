'use client';

import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';
import ModifyChipInfoModal, { ChipPreset, ModifyChipMode } from './ModifyChipInfoModal';

type Preset = { emoji: string | null; label: string };

const BUCKET = 'note-images';

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

  const title = useMemo(
    () => `${date.y}-${String(date.m+1).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`,
    [date]
  );

  const disabled = !canEdit;

  // ── 이미지 URL 표시 (스토리지 경로면 서명URL) ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!imageUrl) { setDisplayImageUrl(null); return; }
      if (/^https?:\/\//i.test(imageUrl)) { setDisplayImageUrl(imageUrl); return; }
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(imageUrl, 60 * 60);
      if (!cancelled) setDisplayImageUrl(error ? null : (data?.signedUrl ?? null));
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
    setLinkPanelOpen(false);
    setComboOpen(false);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hasImg = !!base.image_url;
    const wantW = hasImg ? 765 : 550;
    const wantH = hasImg ? 315 : 315;
    const w = Math.min(wantW, Math.floor(vw * 0.98));
    const h = Math.min(wantH, Math.floor(vh * 0.90));
    const x = Math.max(12, Math.floor((vw - w)/2));
    const y = Math.max(12, Math.floor((vh - h)/2));
    setSize({ w, h });
    setPos({ x, y });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

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
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(imageUrl, 60 * 60);
      if (!error && data?.signedUrl) setDisplayImageUrl(data.signedUrl);
      return;
    }
    const path = extractPathFromPublicUrl(imageUrl);
    if (path) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (!error && data?.signedUrl) setDisplayImageUrl(data.signedUrl);
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

  async function clearAll(){
    if(!canEdit){ setMemo(''); return; }
    const ok = window.confirm('해당 날짜의 메모/아이템/색상/링크/이미지를 모두 삭제할까요?');
    if(!ok) return;
    try{
      const { error } = await supabase.from('notes').delete()
        .eq('y', date.y).eq('m', date.m).eq('d', date.d);
      if(error) throw new Error(error.message);
      const cleared = normalizeNote({ ...emptyNote });
      setNote(cleared);
      setMemo(''); setInitialMemo('');
      setLinkInput('');
      setImageUrl(null); setDisplayImageUrl(null);
      setLinkPanelOpen(false); setComboOpen(false);
      alert('초기화했습니다.');
      onSaved(cleared);
    }catch(e:any){ alert(e?.message ?? '초기화 중 오류'); }
  }

  function onDoubleClickChip(idx:number){
    if (!canEdit) return;
    const cur = note.items?.[idx]; if(!cur) return;
    setChipModalPreset({ emoji: cur.emoji ?? null, label: cur.label });
    setChipModalMode('edit');
    setChipEditIndex(idx);
    setChipModalOpen(true);
  }

  async function applyAddChip(text: string, overridePreset?: ChipPreset){
    if(!canEdit) return;
    const base = overridePreset ?? chipModalPreset;
    const newItem: Item = {
      emoji: base.emoji ?? null,
      label: base.label,
      text: text || undefined,
      emojiOnly: !text
    };
    const items = [...(note.items || []), newItem];
    try{ await persist({ items }); }
    catch(e:any){ alert(e?.message ?? '아이템 추가 중 오류'); }
    setChipModalOpen(false);
  }

  async function applyEditChip(text: string, overridePreset?: ChipPreset){
    if(!canEdit || chipEditIndex==null) return;
    const items = [...(note.items || [])];
    const cur = items[chipEditIndex]; if(!cur) return;
    items[chipEditIndex] = {
      ...cur,
      text: text || undefined,
      emojiOnly: !text,
      emoji: (overridePreset?.emoji !== undefined) ? (overridePreset?.emoji ?? null) : cur.emoji
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
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  function onDragOverChip(e:React.DragEvent<HTMLSpanElement>){
    if(!canEdit) return;
    e.preventDefault(); e.dataTransfer.dropEffect='move';
  }
  async function onDropChip(e:React.DragEvent<HTMLSpanElement>, targetIdx:number){
    if(!canEdit) return;
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if(isNaN(from) || from===targetIdx) return;
    const items = [...(note.items || [])]; const [moved] = items.splice(from, 1); items.splice(targetIdx, 0, moved);
    try{ await persist({ items }); setDragIndex(null); }
    catch(e:any){ alert(e?.message ?? '순서 변경 중 오류'); }
  }
  async function onDropContainer(e:React.DragEvent<HTMLDivElement>){
    if(!canEdit) return;
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain')); if(isNaN(from)) return;
    const items = [...(note.items || [])]; const [moved] = items.splice(from, 1); items.push(moved);
    try{ await persist({ items }); setDragIndex(null); }
    catch(e:any){ alert(e?.message ?? '순서 변경 중 오류'); }
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

  // ── 업로드(비GIF는 WebP 압축) ────────────────────────────────────────────
  async function compressToWebp(file: File, max = 1600, quality = 0.82): Promise<Blob> {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image(); el.onload = () => res(el); el.onerror = rej;
      el.src = URL.createObjectURL(file);
    });
    const r = Math.min(max / img.width, max / img.height, 1);
    const w = Math.round(img.width * r), h = Math.round(img.height * r);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise((ok) => canvas.toBlob((b) => ok(b!), 'image/webp', quality));
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!canEdit) { alert('권한이 없습니다.'); e.currentTarget.value=''; return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { alert('로그인 필요'); setUploading(false); e.currentTarget.value=''; return; }

      const isGif = f.type === 'image/gif' || /\.gif$/i.test(f.name);
      if (isGif && f.size > 8 * 1024 * 1024) {
        alert('GIF 용량이 큽니다(>8MB). 크기를 줄여 다시 시도하세요.');
        setUploading(false);
        e.currentTarget.value = '';
        return;
      }

      let blob: Blob, ext: 'gif' | 'webp', contentType: string;
      if (isGif) {
        blob = f; ext='gif'; contentType='image/gif';
      } else {
        blob = await compressToWebp(f); ext='webp'; contentType='image/webp';
      }

      const path = `${date.y}/${date.m + 1}/${date.d}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET)
        .upload(path, blob, { upsert: true, contentType });
      if (error) throw error;

      await persist({ image_url: path });
      setImageUrl(path);

      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      setDisplayImageUrl(signed?.signedUrl ?? null);

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
    <div className="modal" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet modal-draggable"
        style={{
          position:'absolute',
          left: pos.x, top: pos.y,
          width: size.w, height: size.h,
          minWidth: 420, minHeight: 320,
          maxWidth: Math.min(1100, window.innerWidth - 24),
          maxHeight: Math.min(900, window.innerHeight - 24),
          resize:'both',
          overflow:'auto'
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
            style={{ marginLeft: 12, padding:'6px 8px', borderRadius:8, minWidth:180 }}
            aria-label="셀 상단 타이틀"
            disabled={disabled}
          />

          <div className="flag-buttons" aria-label="날짜 강조 색상" style={{ userSelect:'none' }}>
            <button
              className={`rest-btn ${isRest ? 'active' : ''}`}
              onClick={toggleRest}
              title="휴(휴방)"
              aria-label="휴(휴방)"
              disabled={disabled}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
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
               onDragOver={(e)=>{ if(!disabled){ e.preventDefault(); }}}
               onDrop={(e)=>{ if(!disabled) onDropContainer(e); }}>
            {note.items.map((it:Item, idx:number)=>(
              <span key={idx} className="chip"
                    title={canEdit ? '더블클릭: 편집, 드래그: 순서 변경' : '보기 전용'}
                    onDoubleClick={()=> { if(!disabled) onDoubleClickChip(idx); }}
                    draggable={!disabled}
                    onDragStart={(e)=>{ if(!disabled) onDragStartChip(e, idx); }}
                    onDragOver={(e)=>{ if(!disabled) onDragOverChip(e); }}
                    onDrop={(e)=>{ if(!disabled) onDropChip(e, idx); }}
                    style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      border:'1px solid var(--border)', borderRadius:999, padding:'4px 10px',
                      fontSize:12, background:'var(--card)', color:'inherit',
                      ...(dragIndex===idx ? { opacity:.6 } : null)
                    }}>
                <span className="chip-emoji">{it.emoji ?? ''}</span>
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
                style={{width:'100%', minHeight:160, borderRadius:10, resize:'none'}}
                disabled={disabled}
              />
            )}

            {linkPanelOpen && (
              <div style={{ display:'flex', gap:8, alignItems:'center',
                            border:'1px solid var(--border)', borderRadius:10,
                            padding:'8px 10px', background:'#fff', marginTop:8 }}>
                <input placeholder="https://example.com" value={linkInput}
                       onChange={(e)=> setLinkInput(e.target.value)}
                       onBlur={()=> setLinkInput(s => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))}
                       style={{ flex:1, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8 }}
                       disabled={disabled} />
                <button type="button" onClick={saveLink} disabled={disabled}>링크 저장</button>
                <button type="button" onClick={deleteLink} disabled={disabled}>링크 삭제</button>
              </div>
            )}

            {/* 하단 버튼: [초기화] | [저장 | 이미지삽입, 이미지제거, 링크 | 닫기] */}
            <div className="actions" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:8 }}>
              <div className="actions-left" style={{ marginRight:'auto' }}>
                <button onClick={clearAll} disabled={disabled} className="btn-plain-danger">초기화</button>
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
              <div className="note-image-box">
                <img
                  src={displayImageUrl}
                  alt="미리보기"
                  onError={()=> { fallbackToSignedUrlIfNeeded(); }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 칩 편집 모달 */}
        <ModifyChipInfoModal
          open={chipModalOpen}
          mode={chipModalMode}
          preset={chipModalPreset}
          initialText={chipModalMode==='edit' && chipEditIndex!=null ? (note.items[chipEditIndex]?.text ?? '') : ''}
          onSave={(t, p)=> chipModalMode==='add' ? applyAddChip(t, p) : applyEditChip(t, p)}
          onDelete={chipModalMode==='edit' ? deleteChip : undefined}
          onClose={()=> setChipModalOpen(false)}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
