'use client';
import { createClient } from '@/lib/supabaseClient';
import { useMemo, useState } from 'react';

type Note = { id?:number; y:number; m:number; d:number; content:string; items:any[]; is_rest:boolean };

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

  if (open && initial && note.id !== initial.id) setNote(initial);

  async function save(upd:Partial<Note>){
    const payload = { ...note, ...upd };
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict:'y,m,d' })
      .select()
      .single();
    if(error){ alert(error.message); return; }
    setNote(data as any);
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

  if(!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:'8px 0'}}>{title}</h3>

        <div style={{fontSize:13, opacity:.8, marginBottom:8}}>아이템</div>
        {(note.items?.length||0)===0 ? (
          <div style={{opacity:.6,fontSize:13}}>없음</div>
        ) : (
          <div className="chips">
            {note.items.map((it:any,idx:number)=>(
              <span key={idx} className="chip">
                {it.emoji ? `${it.emoji} ` : ''}{it.label}
              </span>
            ))}
          </div>
        )}

        <div style={{fontSize:13, opacity:.8, margin:'12px 0 6px'}}>메모</div>
        <div style={{whiteSpace:'pre-wrap', border:'1px dashed var(--border)', borderRadius:8, padding:10, minHeight:48}}>
          {note.content || <span style={{opacity:.5}}>내용 없음</span>}
        </div>

        <div className="bar">
          {canEdit && (
            <>
              <button onClick={toggleRest} style={{borderColor:'var(--restFg)'}}>
                {note.is_rest ? '휴방 해제' : '휴방'}
              </button>
              <button onClick={clearContent}>내용 삭제</button>
            </>
          )}
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
