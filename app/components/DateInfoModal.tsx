'use client';

import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';

type Preset = { emoji: string | null; label: string };

export default function DateInfoModal({
  open, onClose, date, note: initial, canEdit, onSaved
}:{
  open:boolean; onClose:()=>void;
  date:{y:number;m:number;d:number};
  note:Note|null;
  canEdit:boolean;
  onSaved:(n:Note)=>void;
}){
  const supabase = createClient();

  // 빈 노트 (공통 타입 규격으로 생성)
  const emptyNote: Note = normalizeNote({
    y:date.y, m:date.m, d:date.d, content:'', items:[], color:null, link:null, image_url:null
  });

  const [note, setNote] = useState<Note>(initial || emptyNote);
  const [memo, setMemo] = useState(note.content || '');
  const [initialMemo, setInitialMemo] = useState(note.content || '');

  // 칩 편집 상태
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // 드래그 상태(순서 변경)
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 링크/이미지 상태
  const [linkInput, setLinkInput] = useState<string>(note.link ?? '');
  const [linkPanelOpen, setLinkPanelOpen] = useState<boolean>(false); // 링크 버튼 토글
  const [imageUrl, setImageUrl] = useState<string | null>(note.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 프리셋 추가 관련
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const loadingPresetsRef = useRef(false);

  const title = useMemo(
    () => `${date.y}-${String(date.m+1).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`,
    [date]
  );

  useEffect(()=>{
    if (!open) return;
    const base = initial || emptyNote;
    setNote(base);
    setMemo(base.content || '');
    setInitialMemo(base.content || '');
    setEditingIndex(null);
    setEditingText('');
    setDragIndex(null);
    setLinkInput(base.link ?? '');
    setImageUrl(base.image_url ?? null);
    setLinkPanelOpen(false);
    setPresetPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // 항상 Note 반환(에러 throw)
  async function persist(upd: Partial<Note>): Promise<Note> {
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
    try{
      await persist({ color: next });
    }catch(e:any){
      alert(e?.message ?? '플래그 저장 중 오류가 발생했습니다.');
    }
  }

  async function saveMemo(){
    if (!canEdit) return;
    try{
      const saved = await persist({ content: memo });
      setInitialMemo(saved.content || '');
      alert('메모가 저장되었습니다.');
    }catch(e:any){
      alert(e?.message ?? '저장 중 오류가 발생했습니다.');
    }
  }

  function resetMemo(){
    setMemo(initialMemo || '');
  }

  // 초기화: 행 삭제(메모/아이템/플래그/링크/이미지 모두 제거)
  async function clearAll(){
    if(!canEdit){
      setMemo('');
      return;
    }
    const ok = window.confirm('해당 날짜의 메모/아이템/색상/링크/이미지를 모두 삭제할까요?');
    if(!ok) return;

    try{
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('y', date.y)
        .eq('m', date.m)
        .eq('d', date.d);
      if(error) throw new Error(error.message);

      const cleared = normalizeNote({ ...emptyNote });
      setNote(cleared);
      setMemo('');
      setInitialMemo('');
      setEditingIndex(null);
      setLinkInput('');
      setImageUrl(null);
      setLinkPanelOpen(false);
      setPresetPickerOpen(false);
      alert('초기화했습니다.');
      onSaved(cleared);
    }catch(e:any){
      alert(e?.message ?? '초기화 중 오류가 발생했습니다.');
    }
  }

  // ===== 칩 더블클릭 → 편집 모드 진입 =====
  function onDoubleClickChip(idx:number){
    // 읽기 모드에서도 패널은 띄우되, 저장/삭제만 비활성화
    const cur = note.items?.[idx];
    if(!cur) return;
    setEditingIndex(idx);
    setEditingText(cur.text ?? '');
  }

  // 편집 저장
  async function saveChipEdit(){
    if(editingIndex===null || !canEdit) return;
    const items = [...(note.items || [])];
    const cur = items[editingIndex];
    if(!cur) return;

    const t = editingText.trim();
    items[editingIndex] = {
      ...cur,
      text: t.length ? t : undefined,
      emojiOnly: t.length ? false : true, // 입력 비어있으면 아이콘만
    };

    try{
      await persist({ items });
      setEditingIndex(null);
      setEditingText('');
    }catch(e:any){
      alert(e?.message ?? '아이템 저장 중 오류가 발생했습니다.');
    }
  }

  // 편집 취소
  function cancelChipEdit(){
    setEditingIndex(null);
    setEditingText('');
  }

  // 편집 중 삭제 버튼
  async function deleteChip(){
    if(editingIndex===null || !canEdit) return;
    const ok = window.confirm('해당 아이템을 삭제할까요?');
    if(!ok) return;

    const items = [...(note.items || [])];
    items.splice(editingIndex, 1);

    try{
      await persist({ items });
      setEditingIndex(null);
      setEditingText('');
    }catch(e:any){
      alert(e?.message ?? '아이템 삭제 중 오류가 발생했습니다.');
    }
  }

  // ===== 칩 순서 변경(드래그/드랍) =====
  function onDragStartChip(e: React.DragEvent<HTMLSpanElement>, idx: number){
    if(!canEdit) return;
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  function onDragOverChip(e: React.DragEvent<HTMLSpanElement>){
    if(!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  async function onDropChip(e: React.DragEvent<HTMLSpanElement>, targetIdx: number){
    if(!canEdit) return;
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if(isNaN(from) || from === targetIdx) return;

    const items = [...(note.items || [])];
    const [moved] = items.splice(from, 1);
    items.splice(targetIdx, 0, moved);

    try{
      await persist({ items });
      setDragIndex(null);
    }catch(e:any){
      alert(e?.message ?? '순서 변경 중 오류가 발생했습니다.');
    }
  }
  async function onDropContainer(e: React.DragEvent<HTMLDivElement>){
    if(!canEdit) return;
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if(isNaN(from)) return;

    const items = [...(note.items || [])];
    const [moved] = items.splice(from, 1);
    items.push(moved);

    try{
      await persist({ items });
      setDragIndex(null);
    }catch(e:any){
      alert(e?.message ?? '순서 변경 중 오류가 발생했습니다.');
    }
  }

  function chipLabel(it: Item){
    if (it.text && it.text.length) return it.text;
    if (it.emojiOnly) return it.emoji ? it.emoji : it.label;
    return `${it.emoji ? it.emoji+' ' : ''}${it.label}`;
  }

  // ───────── 링크 & 이미지 유틸 ─────────
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
    } catch (e:any) {
      alert(e?.message ?? '링크 저장 중 오류가 발생했습니다.');
    }
  }

  async function deleteLink() {
    if (!canEdit) return;
    try {
      await persist({ link: null });
      setLinkInput('');
    } catch (e:any) {
      alert(e?.message ?? '링크 삭제 중 오류가 발생했습니다.');
    }
  }

  async function compressToWebp(file: File, max = 1600, quality = 0.82): Promise<Blob> {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
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
    if (!canEdit) { alert('권한이 없습니다.'); return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { alert('로그인 필요'); setUploading(false); e.currentTarget.value=''; return; }

      const blob = await compressToWebp(f);
      const path = `${date.y}/${date.m + 1}/${date.d}/${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from('note-images')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' });
      if (error) throw error;

      const { data } = supabase.storage.from('note-images').getPublicUrl(path);
      const saved = await persist({ image_url: data.publicUrl });
      setImageUrl(saved.image_url);
    } catch (err:any) {
      alert(err?.message ?? '이미지 업로드 실패');
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  function openPicker(){ fileRef.current?.click(); }

  async function removeImage() {
    if (!canEdit) return;
    try {
      const saved = await persist({ image_url: null });
      setImageUrl(saved.image_url);
    } catch (e:any) {
      alert(e?.message ?? '이미지 제거 중 오류가 발생했습니다.');
    }
  }

  // ───────── 프리셋 로드 & 추가 ─────────
  async function ensurePresets() {
    if (presets || loadingPresetsRef.current) return;
    loadingPresetsRef.current = true;
    try {
      // presets 테이블이 있으면 거기서 불러오고, 없거나 에러면 기본 세트 사용
      const { data, error } = await supabase.from('presets').select('emoji,label');
      if (!error && data && Array.isArray(data) && data.length) {
        setPresets(
          data.map((r:any)=>({ emoji: r.emoji ?? null, label: String(r.label ?? '') }))
        );
      } else {
        setPresets([
          { emoji: '📢', label: '공지' },
          { emoji: '🔔', label: '알림' },
          { emoji: '⚽', label: '축구' },
          { emoji: '⚾', label: '야구' },
          { emoji: '🏁', label: 'F1' },
          { emoji: '🥎', label: '촌지' },
          { emoji: '🏆', label: '대회' },
          { emoji: '🎮', label: '게임' },
          { emoji: '📺', label: '함께' },
          { emoji: '🤼‍♂️', label: '합방' },
          { emoji: '👄', label: '저챗' },
          { emoji: '🍚', label: '광고' },
          { emoji: '🎤', label: '노래' },
        ]);
      }
    } catch {
      setPresets([
          { emoji: '📢', label: '공지' },
          { emoji: '🔔', label: '알림' },
          { emoji: '⚽', label: '축구' },
          { emoji: '⚾', label: '야구' },
          { emoji: '🏁', label: 'F1' },
          { emoji: '🥎', label: '촌지' },
          { emoji: '🏆', label: '대회' },
          { emoji: '🎮', label: '게임' },
          { emoji: '📺', label: '함께' },
          { emoji: '🤼‍♂️', label: '합방' },
          { emoji: '👄', label: '저챗' },
          { emoji: '🍚', label: '광고' },
          { emoji: '🎤', label: '노래' },
      ]);
    } finally {
      loadingPresetsRef.current = false;
    }
  }

  async function addPresetItem(p: Preset) {
    if (!canEdit) return;
    const items = [...(note.items || [])];
    const newItem: Item = {
      emoji: p.emoji ?? null,
      label: p.label,
      emojiOnly: true, // 텍스트 없이 아이콘/라벨만
    };
    items.push(newItem); // 맨 끝 → 우측에 배치됨
    try {
      await persist({ items });
      setPresetPickerOpen(false);
    } catch (e:any) {
      alert(e?.message ?? '아이템 추가 중 오류가 발생했습니다.');
    }
  }

  if(!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        {/* 날짜 + 초기화 + 플래그 */}
        <div className="date-head">
          <h3 style={{margin:'8px 0'}}>{title}</h3>

          <button
            onClick={clearAll}
            title="초기화"
            aria-label="초기화"
            style={{ marginLeft:'auto', fontSize:12, padding:'6px 8px', borderRadius:8 }}
          >
            초기화
          </button>

          <div className="flag-buttons" aria-label="날짜 강조 색상">
            <button
              className={`flag-btn red ${note.color==='red'?'active':''}`}
              onClick={()=>toggleFlag('red')}
              title="빨간날"
              aria-label="빨간날로 표시"
            />
            <button
              className={`flag-btn blue ${note.color==='blue'?'active':''}`}
              onClick={()=>toggleFlag('blue')}
              title="파란날"
              aria-label="파란날로 표시"
            />
          </div>
        </div>

        {/* 아이템 목록 + (+) 버튼 */}
        {(note.items?.length || 0) === 0 ? (
          <div style={{opacity:.6,fontSize:13, marginBottom:6}}>
            아이템 없음
            <button
              onClick={async ()=>{
                await ensurePresets();
                setPresetPickerOpen(v=>!v);
              }}
              style={{ marginLeft:8, border:'1px dashed var(--border)', borderRadius:999, padding:'2px 10px' }}
              title="아이템 추가"
              aria-label="아이템 추가"
            >＋</button>
          </div>
        ) : (
          <div
            className="chips"
            style={{marginBottom:6, display:'flex', flexWrap:'wrap', gap:8}}
            onDragOver={(e)=>{ if(canEdit){ e.preventDefault(); }}}
            onDrop={onDropContainer}
          >
            {note.items.map((it:Item, idx:number)=>(
              <span
                key={idx}
                className="chip"
                title={canEdit ? '더블클릭: 편집, 드래그: 순서 변경' : '더블클릭: 보기'}
                onDoubleClick={()=> onDoubleClickChip(idx)}
                draggable={canEdit}
                onDragStart={(e)=>onDragStartChip(e, idx)}
                onDragOver={onDragOverChip}
                onDrop={(e)=>onDropChip(e, idx)}
                style={{
                  display:'inline-flex', alignItems:'center',
                  border:'1px solid var(--border)', borderRadius:999, padding:'4px 10px',
                  fontSize:12, background:'#fff',
                  ...(dragIndex===idx ? { opacity:.6 } : null)
                }}
              >
                {chipLabel(it)}
              </span>
            ))}

            {/* (+) 버튼은 항상 맨 끝(우측)에 표시 */}
            <button
              onClick={async ()=>{
                await ensurePresets();
                setPresetPickerOpen(v=>!v);
              }}
              style={{
                border:'1px dashed var(--border)', borderRadius:999, padding:'4px 10px',
                background:'#fff', cursor:'pointer', fontSize:12
              }}
              title="아이템 추가"
              aria-label="아이템 추가"
            >＋</button>
          </div>
        )}

        {/* 프리셋 선택 박스 (토글) */}
        {presetPickerOpen && presets && (
          <div
            style={{
              border:'1px solid var(--border)', borderRadius:10, padding:8,
              margin:'6px 0 4px', background:'#fff'
            }}
          >
            <div style={{fontSize:12, opacity:.7, marginBottom:6}}>프리셋 선택</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:6}}>
              {presets.map((p, i)=>(
                <button
                  key={i}
                  onClick={()=> addPresetItem(p)}
                  disabled={!canEdit}
                  style={{
                    display:'flex', alignItems:'center', gap:8,
                    border:'1px solid var(--border)', borderRadius:8,
                    padding:'6px 8px', textAlign:'left', background:'#fff',
                    opacity: canEdit ? 1 : .6, cursor: canEdit ? 'pointer' : 'not-allowed'
                  }}
                >
                  <span>{p.emoji ?? ''}</span>
                  <span style={{fontSize:12}}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ▽ 칩 편집 영역: 이제 canEdit와 무관하게 "표시"는 됨 (버튼/입력만 제어) */}
        {editingIndex!==null && (
          <div style={{
            display:'flex', gap:8, alignItems:'center',
            padding:'8px 10px', border:'1px solid var(--border)',
            borderRadius:10, margin:'10px 0 4px', background:'#fff'
          }}>
            <span style={{fontSize:12, opacity:.7}}>
              아이템 편집{!canEdit ? ' (읽기 전용)' : ''}
            </span>
            <input
              value={editingText}
              onChange={(e)=>setEditingText(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter' && canEdit) saveChipEdit(); }}
              placeholder="빈칸으로 저장하면 아이콘만 표시"
              style={{flex:1, padding:'6px 8px', borderRadius:8}}
              readOnly={!canEdit}
            />
            <button onClick={saveChipEdit} disabled={!canEdit}>저장</button>
            <button onClick={deleteChip} disabled={!canEdit} style={{borderColor:'#b12a2a', color: canEdit ? '#b12a2a' : undefined}}>삭제</button>
            <button onClick={cancelChipEdit}>닫기</button>
          </div>
        )}

        {/* ===== 메모 + (링크 패널) + 하단 버튼들 ===== */}
        {!canEdit ? (
          <div style={{whiteSpace:'pre-wrap', border:'1px dashed var(--border)', borderRadius:8, padding:10, minHeight:96}}>
            {note.content || <span style={{opacity:.5}}>메모 없음</span>}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* 메모 */}
            <textarea
              value={memo}
              onChange={(e)=>setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              style={{width:'100%', minHeight:140, borderRadius:10, resize:'none'}}
            />

            {/* ▽ 링크 패널(토글) — 메모와 버튼 사이에 표시 */}
            {linkPanelOpen && (
              <div
                style={{
                  display:'flex', gap:8, alignItems:'center',
                  border:'1px solid var(--border)', borderRadius:10,
                  padding:'8px 10px', background:'#fff'
                }}
              >
                <input
                  placeholder="https://example.com"
                  value={linkInput}
                  onChange={(e)=> setLinkInput(e.target.value)}
                  onBlur={()=> setLinkInput(s => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))}
                  style={{ flex:1, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8 }}
                />
                <button type="button" onClick={saveLink} disabled={!canEdit}>링크 저장</button>
                <button type="button" onClick={deleteLink} disabled={!canEdit}>링크 삭제</button>
              </div>
            )}

            {/* 하단 버튼 줄: 메모/리셋/닫기 + (이미지 삽입) (링크 토글) */}
            <div className="actions" style={{ display:'flex', flexWrap:'wrap', alignItems:'left'}}>
              <button onClick={openPicker} disabled={!canEdit || uploading}>
                {uploading ? '업로드 중…' : '이미지 삽입'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display:'none' }} />

              <button
                type="button"
                onClick={()=> setLinkPanelOpen(v=>!v)}
                aria-expanded={linkPanelOpen}
                aria-controls="link-panel"
              >
                링크
              </button>

              {imageUrl && (
                <button onClick={removeImage} disabled={!canEdit}>이미지 제거</button>
              )}
            </div>

            <div className="actions" style={{ display:'flex', flexWrap:'wrap', alignItems:'right' }}>
              <button onClick={saveMemo} disabled={!canEdit}>메모 저장</button>
              <button onClick={resetMemo}>리셋</button>
              <button onClick={onClose}>닫기</button>
            </div>

            {/* (읽기 전용 미리보기는 하단에 유지) */}
            {imageUrl && (
              <div style={{ width:'100%', maxWidth:480 }}>
                <div style={{ width:'100%', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                  <img src={imageUrl} alt="미리보기" style={{ width:'100%', display:'block' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
