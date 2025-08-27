'use client';
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useRef, useState } from 'react';

type Note = {
  id?:number;
  y:number; m:number; d:number;
  content:string;
  items:any[];
  is_rest:boolean;
  link?: string | null;
  image_url?: string | null;
};

export default function DateInfoModal({
  open, onClose, date, note:initial, canEdit, onSaved
}:{
  open:boolean; onClose:()=>void;
  date:{y:number;m:number;d:number};
  note:Note|null;
  canEdit:boolean;
  onSaved:(n:Note)=>void;
}){
  const supabase = createClient();
  const [note,setNote]=useState<Note>( initial || {y:date.y,m:date.m,d:date.d, content:'', items:[], is_rest:false} );
  const title = useMemo(()=>`${date.y}-${(date.m+1).toString().padStart(2,'0')}-${date.d.toString().padStart(2,'0')}`,[date]);

  // 로컬 편집 상태
  const [content, setContent] = useState(note.content || '');
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkInput, setLinkInput] = useState(note.link || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 초기 note가 바뀔 때 동기화
  useEffect(()=>{
    if (open && initial && note.id !== initial.id) {
      setNote(initial);
      setContent(initial.content || '');
      setLinkInput(initial.link || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  async function save(upd:Partial<Note>){
    const payload = { ...note, ...upd };
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict:'y,m,d' })
      .select()
      .single();
    if(error){ alert(error.message); return; }
    setNote(data as any);
    // 로컬 상태 동기화
    setContent((data as any).content ?? '');
    setLinkInput((data as any).link ?? '');
    onSaved(data as any);
  }

  async function toggleRest(){
    if(!canEdit) return;
    await save({ is_rest: !note.is_rest });
  }
  async function clearContent(){
    if(!canEdit) return;
    await save({ content:'', items:[] });
  }
  async function saveContent(){
    if(!canEdit) return;
    await save({ content });
  }

  // 이미지 압축: 최대 폭 1280, JPEG 품질 자동 조정
  async function compressImage(file: File): Promise<Blob> {
    const img = await new Promise<HTMLImageElement>((res, rej)=>{
      const el = new Image();
      el.onload = ()=> res(el);
      el.onerror = rej;
      el.src = URL.createObjectURL(file);
    });
    const maxW = 1280;
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);

    let q = 0.86;
    let blob = await new Promise<Blob| null>(r=> canvas.toBlob(r, 'image/jpeg', q));
    // 400KB 이하로 줄이기 위해 퀄리티 하향 루프
    while (blob && blob.size > 400*1024 && q > 0.5) {
      q -= 0.06;
      blob = await new Promise<Blob| null>(r=> canvas.toBlob(r, 'image/jpeg', q));
    }
    if(!blob) throw new Error('이미지 압축 실패');
    return blob;
  }

  async function onPickImage(){
    if(!canEdit) return;
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0];
    if(!f) return;
    try{
      setUploading(true);
      const blob = await compressImage(f);
      const name = `${date.y}/${date.m+1}/${date.d}/${Date.now()}.jpg`;
      const bucket = 'note-images';
      const { error: upErr } = await supabase.storage.from(bucket).upload(name, blob, {
        contentType: 'image/jpeg', upsert: true,
      });
      if(upErr){ throw upErr; }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(name);
      const url = pub?.publicUrl;
      if(!url) throw new Error('공개 URL 생성 실패');
      await save({ image_url: url });
    } catch(err:any){
      alert(err?.message || '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function normUrl(s: string){
    const t = s.trim();
    if(!t) return '';
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }
  async function onSaveLink(){
    if(!canEdit) return;
    const v = linkInput.trim();
    if(!v){ await save({ link: null }); setShowLinkEditor(false); return; }
    await save({ link: normUrl(v) });
    setShowLinkEditor(false);
  }
  async function onDeleteLink(){
    if(!canEdit) return;
    await save({ link: null });
    setShowLinkEditor(false);
  }
  async function onDeleteImage(){
    if(!canEdit) return;
    await save({ image_url: null });
  }

  if(!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:'8px 0'}}>{title}</h3>

        {/* 아이템(기존 그대로 표시) */}
        <div style={{fontSize:13, opacity:.8, marginBottom:8}}>아이템</div>
        {(note.items?.length||0)===0 ? <div style={{opacity:.6,fontSize:13}}>없음</div> :
          <ul style={{display:'flex', gap:8, flexWrap:'wrap', margin:0, padding:0, listStyle:'none'}}>
            {note.items.map((it:any,idx:number)=>(
              <li key={idx} style={{border:'1px solid var(--border)', borderRadius:999, padding:'6px 10px'}}>{it.emoji} {it.label}</li>
            ))}
          </ul>
        }

        {/* 메모 + 이미지 (horizontal) */}
        <div style={{fontSize:13, opacity:.8, margin:'12px 0 6px'}}>메모</div>
        <div className="edit-row">
          <div className="memo-col">
            {canEdit ? (
              <textarea
                value={content}
                onChange={(e)=>setContent(e.target.value)}
                placeholder="메모를 입력하세요"
                rows={8}
              />
            ) : (
              <div style={{whiteSpace:'pre-wrap', border:'1px dashed var(--border)', borderRadius:8, padding:10, minHeight:48}}>
                {note.content || <span style={{opacity:.5}}>내용 없음</span>}
              </div>
            )}
          </div>

          {/* 이미지 영역: 이미지가 있을 때만 렌더 → 공간 점유 없음 */}
          {!!note.image_url && (
            <div className="image-col">
              <img src={note.image_url} alt="첨부 이미지" />
              {canEdit && (
                <button type="button" onClick={onDeleteImage} style={{marginTop:6}}>이미지 제거</button>
              )}
            </div>
          )}
        </div>

        {/* 좌측 하단: 이미지 삽입 / 하이퍼 링크 지정 */}
        <div className="bar bar-split">
          <div className="bar-left">
            {canEdit && (
              <>
                <button type="button" onClick={onPickImage} disabled={uploading}>
                  {uploading ? '업로드 중…' : '이미지 삽입'}
                </button>
                <input
                  ref={fileRef} type="file" accept="image/*" hidden
                  onChange={onFileChange}
                />
                <button type="button" onClick={()=>setShowLinkEditor(s=>!s)}>
                  하이퍼 링크 지정
                </button>
              </>
            )}
          </div>
          <div className="bar-right">
            {canEdit && (
              <>
                <button onClick={toggleRest} style={{borderColor:'var(--restFg)'}}>
                  {note.is_rest ? '휴방 해제' : '휴방'}
                </button>
                <button onClick={clearContent}>내용 삭제</button>
                <button onClick={saveContent} disabled={content===note.content}>메모 저장</button>
              </>
            )}
            <button onClick={onClose}>닫기</button>
          </div>
        </div>

        {/* 링크 편집 패널 (정보 편집창과 동일한 톤) */}
        {showLinkEditor && (
          <div className="subsheet">
            <div style={{fontWeight:700, marginBottom:8}}>하이퍼 링크</div>
            <input
              placeholder="https://example.com"
              value={linkInput}
              onChange={(e)=> setLinkInput(e.target.value)}
              style={{width:'100%'}}
            />
            <div className="bar" style={{marginTop:8, justifyContent:'space-between'}}>
              <div>
                <button type="button" onClick={onSaveLink}>저장</button>
                <button type="button" onClick={()=>setShowLinkEditor(false)} style={{marginLeft:6}}>닫기</button>
              </div>
              <div>
                {!!note.link && <button type="button" onClick={onDeleteLink}>삭제</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
