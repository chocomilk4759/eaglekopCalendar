'use client';

import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Item } from '@/types/note';
import { normalizeNote } from '@/types/note';

type Preset = { emoji: string | null; label: string };

const BUCKET = 'note-images';

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

  // 빈 노트
  const emptyNote: Note = normalizeNote({
    y:date.y, m:date.m, d:date.d, content:'', items:[], color:null, link:null, image_url:null
  });

  const [note, setNote] = useState<Note>(initial || emptyNote);
  const [memo, setMemo] = useState(note.content || '');
  const [initialMemo, setInitialMemo] = useState(note.content || '');

  // 칩 편집/드래그
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 링크/이미지 상태
  const [linkInput, setLinkInput] = useState<string>(note.link ?? '');
  const [linkPanelOpen, setLinkPanelOpen] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(note.image_url ?? null); // 저장된 값(경로 or URL)
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);     // 실제 <img>에 쓰는 URL
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 프리셋
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
    setDisplayImageUrl(null);
    setLinkPanelOpen(false);
    setPresetPickerOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // ========= 이미지 URL 디스플레이 폴백 =========
  useEffect(() => {
    setDisplayImageUrl(imageUrl ?? null); // 공개 버킷이면 그대로 보임
  }, [imageUrl]);

  function extractPathFromPublicUrl(url: string): string | null {
    // https://.../storage/v1/object/public/note-images/<PATH>
    const m = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = m[1];
    const path = m[2];
    if (bucket !== BUCKET) return null;
    return path;
  }

  async function fallbackToSignedUrlIfNeeded() {
    if (!imageUrl) return;
    // 경로만 저장된 경우
    if (!/^https?:\/\//i.test(imageUrl)) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(imageUrl, 60 * 60);
      if (!error && data?.signedUrl) setDisplayImageUrl(data.signedUrl);
      return;
    }
    // 공개 URL이지만 접근 불가할 때 경로로 재시도
    const path = extractPathFromPublicUrl(imageUrl);
    if (path) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (!error && data?.signedUrl) setDisplayImageUrl(data.signedUrl);
    }
  }

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
  function resetMemo(){ setMemo(initialMemo || ''); }

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
      setEditingIndex(null); setLinkInput('');
      setImageUrl(null); setDisplayImageUrl(null);
      setLinkPanelOpen(false); setPresetPickerOpen(false);
      alert('초기화했습니다.');
      onSaved(cleared);
    }catch(e:any){ alert(e?.message ?? '초기화 중 오류가 발생했습니다.'); }
  }

  // 칩 편집/순서 변경 (표시는 canEdit와 무관)
  function onDoubleClickChip(idx:number){
    const cur = note.items?.[idx]; if(!cur) return;
    setEditingIndex(idx); setEditingText(cur.text ?? '');
  }
  async function saveChipEdit(){
    if(editingIndex===null || !canEdit) return;
    const items = [...(note.items || [])];
    const cur = items[editingIndex]; if(!cur) return;
    const t = editingText.trim();
    items[editingIndex] = { ...cur, text: t.length ? t : undefined, emojiOnly: !t.length };
    try{ await persist({ items }); setEditingIndex(null); setEditingText(''); }
    catch(e:any){ alert(e?.message ?? '아이템 저장 중 오류'); }
  }
  function cancelChipEdit(){ setEditingIndex(null); setEditingText(''); }
  async function deleteChip(){
    if(editingIndex===null || !canEdit) return;
    const ok = window.confirm('해당 아이템을 삭제할까요?'); if(!ok) return;
    const items = [...(note.items || [])]; items.splice(editingIndex, 1);
    try{ await persist({ items }); setEditingIndex(null); setEditingText(''); }
    catch(e:any){ alert(e?.message ?? '아이템 삭제 중 오류'); }
  }
  function onDragStartChip(e:React.DragEvent<HTMLSpanElement>, idx:number){
    if(!canEdit) return; setDragIndex(idx);
    e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(idx));
  }
  function onDragOverChip(e:React.DragEvent<HTMLSpanElement>){
    if(!canEdit) return; e.preventDefault(); e.dataTransfer.dropEffect='move';
  }
  async function onDropChip(e:React.DragEvent<HTMLSpanElement>, targetIdx:number){
    if(!canEdit) return; e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if(isNaN(from) || from===targetIdx) return;
    const items = [...(note.items || [])]; const [moved] = items.splice(from, 1); items.splice(targetIdx, 0, moved);
    try{ await persist({ items }); setDragIndex(null); }
    catch(e:any){ alert(e?.message ?? '순서 변경 중 오류'); }
  }
  async function onDropContainer(e:React.DragEvent<HTMLDivElement>){
    if(!canEdit) return; e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain')); if(isNaN(from)) return;
    const items = [...(note.items || [])]; const [moved] = items.splice(from, 1); items.push(moved);
    try{ await persist({ items }); setDragIndex(null); }
    catch(e:any){ alert(e?.message ?? '순서 변경 중 오류'); }
  }

  // 링크
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

  // 이미지 업로드: DB에는 "경로"를 저장(공개/비공개 모두 호환)
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
    if (!canEdit) { alert('권한이 없습니다.'); return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { alert('로그인 필요'); setUploading(false); e.currentTarget.value=''; return; }

      const blob = await compressToWebp(f);
      const path = `${date.y}/${date.m + 1}/${date.d}/${Date.now()}.webp`;
      const { error } = await supabase.storage.from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: 'image/webp' });
      if (error) throw error;

      await persist({ image_url: path });        // DB에는 경로 저장
      setImageUrl(path);                          // 렌더 폴백 로직이 처리
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      setDisplayImageUrl(signed?.signedUrl ?? null);
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
      setDisplayImageUrl(null);
    } catch (e:any) {
      alert(e?.message ?? '이미지 제거 중 오류');
    }
  }

  // 프리셋
  async function ensurePresets() {
    if (presets || loadingPresetsRef.current) return;
    loadingPresetsRef.current = true;
    try {
      const { data, error } = await supabase.from('presets').select('emoji,label');
      if (!error && data && Array.isArray(data) && data.length) {
        setPresets(data.map((r:any)=>({ emoji: r.emoji ?? null, label: String(r.label ?? '') })));
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
    } finally { loadingPresetsRef.current = false; }
  }
  async function addPresetItem(p: Preset) {
    if (!canEdit) return;
    const items = [...(note.items || [])];
    const newItem: Item = { emoji: p.emoji ?? null, label: p.label, emojiOnly: true };
    items.push(newItem);
    try { await persist({ items }); setPresetPickerOpen(false); }
    catch (e:any) { alert(e?.message ?? '아이템 추가 중 오류'); }
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
            <button className={`flag-btn red ${note.color==='red'?'active':''}`}
                    onClick={()=>toggleFlag('red')} title="빨간날" aria-label="빨간날로 표시" />
            <button className={`flag-btn blue ${note.color==='blue'?'active':''}`}
                    onClick={()=>toggleFlag('blue')} title="파란날" aria-label="파란날로 표시" />
          </div>
        </div>

        {/* 아이템 목록 + (+) 버튼 */}
        {(note.items?.length || 0) === 0 ? (
          <div style={{opacity:.6,fontSize:13, marginBottom:6}}>
            아이템 없음
            <button
              onClick={async ()=>{ await ensurePresets(); setPresetPickerOpen(v=>!v); }}
              style={{ marginLeft:8, border:'1px dashed var(--border)', borderRadius:999, padding:'2px 10px' }}
              title="아이템 추가" aria-label="아이템 추가"
            >＋</button>
          </div>
        ) : (
          <div className="chips" style={{marginBottom:6, display:'flex', flexWrap:'wrap', gap:8}}
               onDragOver={(e)=>{ if(canEdit){ e.preventDefault(); }}}
               onDrop={onDropContainer}>
            {note.items.map((it:Item, idx:number)=>(
              <span key={idx} className="chip"
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
                    }}>
                {it.text?.length ? it.text : (it.emojiOnly ? (it.emoji ?? it.label) : `${it.emoji?it.emoji+' ':''}${it.label}`)}
              </span>
            ))}
            <button
              onClick={async ()=>{ await ensurePresets(); setPresetPickerOpen(v=>!v); }}
              style={{ border:'1px dashed var(--border)', borderRadius:999, padding:'4px 10px',
                       background:'#fff', cursor:'pointer', fontSize:12 }}
              title="아이템 추가" aria-label="아이템 추가"
            >＋</button>
          </div>
        )}

        {/* 프리셋 선택 박스 */}
        {presetPickerOpen && presets && (
          <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:8, margin:'6px 0 4px', background:'#fff' }}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:6}}>
              {presets.map((p, i)=>(
                <button key={i} onClick={()=> addPresetItem(p)} disabled={!canEdit}
                        style={{ display:'flex', alignItems:'center', gap:8,
                                 border:'1px solid var(--border)', borderRadius:8,
                                 padding:'6px 8px', textAlign:'left', background:'#fff',
                                 opacity: canEdit ? 1 : .6, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                  <span>{p.emoji ?? ''}</span>
                  <span style={{fontSize:12}}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 칩 편집 패널 (읽기 모드에서도 표시만) */}
        {editingIndex!==null && (
          <div style={{ display:'flex', gap:8, alignItems:'center',
                        padding:'8px 10px', border:'1px solid var(--border)',
                        borderRadius:10, margin:'10px 0 4px', background:'#fff' }}>
            <span style={{fontSize:12, opacity:.7}}>
              아이템 편집{!canEdit ? ' (읽기 전용)' : ''}
            </span>
            <input value={editingText} onChange={(e)=>setEditingText(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter' && canEdit) saveChipEdit(); }}
                    placeholder="빈칸으로 저장하면 아이콘만 표시"
                    style={{flex:1, padding:'6px 8px', borderRadius:8}} readOnly={!canEdit}/>
            <button onClick={saveChipEdit} disabled={!canEdit}>저장</button>
            <button onClick={deleteChip} disabled={!canEdit}
                    style={{borderColor:'#b12a2a', color: canEdit ? '#b12a2a' : undefined}}>
              삭제
            </button>
            <button onClick={cancelChipEdit}>닫기</button>
          </div>
        )}

        {/* ============ [ 메모 | 이미지 ] 가로 컨테이너 ============ */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          {/* 좌: 메모 + 링크패널 + 하단 버튼들 */}
          <div style={{ flex:'1 1 0', minWidth:0 }}>
            <textarea value={memo} onChange={(e)=>setMemo(e.target.value)}
                      placeholder="메모를 입력하세요"
                      style={{width:'100%', minHeight:160, borderRadius:10, resize:'none'}} />

            {/* 메모와 버튼 사이에 링크 패널(토글) */}
            {linkPanelOpen && (
              <div style={{ display:'flex', gap:8, alignItems:'center',
                            border:'1px solid var(--border)', borderRadius:10,
                            padding:'8px 10px', background:'#fff', marginTop:8 }}>
                <input placeholder="https://example.com" value={linkInput}
                       onChange={(e)=> setLinkInput(e.target.value)}
                       onBlur={()=> setLinkInput(s => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))}
                       style={{ flex:1, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8 }} />
                <button type="button" onClick={saveLink} disabled={!canEdit}>링크 저장</button>
                <button type="button" onClick={deleteLink} disabled={!canEdit}>링크 삭제</button>
              </div>
            )}

            {/* 하단 버튼 줄 */}
            <div className="actions" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:8 }}>
              <button onClick={saveMemo} disabled={!canEdit}>메모 저장</button>
              <button onClick={resetMemo}>리셋</button>
              <button onClick={onClose}>닫기</button>

              <span style={{ flex: '0 0 12px' }} />

              <button onClick={openPicker} disabled={!canEdit || uploading}>
                {uploading ? '업로드 중…' : '이미지 삽입'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display:'none' }} />

              <button type="button" onClick={()=> setLinkPanelOpen(v=>!v)} aria-expanded={linkPanelOpen}>링크</button>

              {imageUrl && <button onClick={removeImage} disabled={!canEdit}>이미지 제거</button>}
            </div>
          </div>

          {/* 우: 이미지 미리보기 — 없으면 렌더하지 않음(공간 미점유) */}
          {displayImageUrl && (
            <div style={{ flex:'0 0 280px' }}>
              <div style={{
                width:'100%', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden',
                background:'#fff'
              }}>
                <img
                  src={displayImageUrl}
                  alt="미리보기"
                  style={{ width:'100%', height:'auto', maxHeight:360, objectFit:'contain', display:'block' }}
                  onError={()=> { fallbackToSignedUrlIfNeeded(); }}
                />
              </div>
            </div>
          )}
        </div>
        {/* ============ /[ 메모 | 이미지 ] ============ */}
      </div>
    </div>
  );
}
