'use client';
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

type Item = { emoji: string | null; label: string; text?: string };
type Note = {
  id?:number; y:number; m:number; d:number;
  content:string; items:Item[];
  color: 'red' | 'blue' | null; // ✅ 플래그
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
  const emptyNote: Note = { y:date.y, m:date.m, d:date.d, content:'', items:[], color:null };

  const [note,setNote]=useState<Note>( initial || emptyNote );
  const [memo, setMemo] = useState(note.content || '');
  const [initialMemo, setInitialMemo] = useState(note.content || '');

  const title = useMemo(()=>`${date.y}-${(date.m+1).toString().padStart(2,'0')}-${date.d.toString().padStart(2,'0')}`,[date]);

  // 초기 note 변경 시 동기화
  useEffect(()=>{
    if(!open) return;
    const base = initial || emptyNote;
    setNote(base);
    setMemo(base.content || '');
    setInitialMemo(base.content || '');
  }, [open, initial?.id]);

  async function persist(upd:Partial<Note>){
    const payload = { ...note, ...upd };
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict:'y,m,d' })
      .select()
      .single();
    if(error){ alert(error.message); return; }
    setNote(data as any);
    onSaved(data as any);
    return data as Note;
  }

  async function toggleFlag(color:'red'|'blue'){
    if(!canEdit) return;
    const next: 'red'|'blue'|null = note.color===color ? null : color;
    await persist({ color: next });
  }

  async function saveMemo(){
    if(!canEdit) return;
    const saved = await persist({ content: memo });
    setInitialMemo(saved.content || '');
    alert('메모가 저장되었습니다.');
  }
  function resetMemo(){
    setMemo(initialMemo || '');
  }

  if(!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        {/* 날짜 + 플래그 버튼들 */}
        <div className="date-head">
          <h3 style={{margin:'8px 0'}}>{title}</h3>
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

        {/* 아이템 표시(참고용) */}
        {(note.items?.length||0)===0 ? (
          <div style={{opacity:.6,fontSize:13, marginBottom:6}}>아이템 없음</div>
        ) : (
          <div className="chips" style={{marginBottom:6}}>
            {note.items.map((it:Item,idx:number)=>(
              <span key={idx} className="chip">
                {it.text?.length ? it.text : `${it.emoji ? it.emoji+' ' : ''}${it.label}`}
              </span>
            ))}
          </div>
        )}

        {/* 메모 편집 / 보기 */}
        {!canEdit ? (
          <div style={{whiteSpace:'pre-wrap', border:'1px dashed var(--border)', borderRadius:8, padding:10, minHeight:96}}>
            {note.content || <span style={{opacity:.5}}>메모 없음</span>}
          </div>
        ) : (
          <>
            <textarea
              value={memo}
              onChange={(e)=>setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              style={{width:'100%', minHeight:140, borderRadius:10}}
            />
            <div className="actions">
              <button onClick={saveMemo}>메모 저장</button>
              <button onClick={resetMemo}>리셋</button>
              <button onClick={onClose}>닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
