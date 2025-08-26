'use client';
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

type Item = { emoji: string | null; label: string; text?: string };
type Note = {
  id?:number; y:number; m:number; d:number;
  content:string; items:Item[];
  color: 'red' | 'blue' | null;
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

  useEffect(()=>{
    if(!open) return;
    const base = initial || emptyNote;
    setNote(base);
    setMemo(base.content || '');
    setInitialMemo(base.content || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // 항상 Note를 반환(에러는 throw)
  async function persist(upd: Partial<Note>): Promise<Note> {
    const payload = { ...note, ...upd };
    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict: 'y,m,d' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    setNote(data as any);
    onSaved(data as any);
    return data as Note;
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

  // ✅ 초기화 버튼: 입력 중 내용 제거 + DB 저장분도 삭제(행 삭제) + 플래그/아이템도 초기화
  async function clearAll(){
    if(!canEdit){
      // 읽기 모드에서도 입력 중 내용만 초기화
      setMemo('');
      return;
    }
    const ok = window.confirm('해당 날짜의 메모/아이템/색상 표시를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.');
    if(!ok) return;

    try{
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('y', date.y)
        .eq('m', date.m)
        .eq('d', date.d);
      if(error) throw new Error(error.message);

      // 로컬 상태 초기화
      setMemo('');
      setInitialMemo('');
      const cleared: Note = { ...emptyNote };
      setNote(cleared);
      onSaved(cleared); // 캘린더 상태 갱신(빈 노트로 동기화)
      alert('초기화했습니다.');
    }catch(e:any){
      alert(e?.message ?? '초기화 중 오류가 발생했습니다.');
    }
  }

  if(!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        {/* 날짜 + 초기화 + 플래그 */}
        <div className="date-head">
          <h3 style={{margin:'8px 0'}}>{title}</h3>

          {/* 초기화 버튼 (날짜 우측) */}
          <button
            onClick={clearAll}
            title="초기화"
            aria-label="초기화"
            style={{
              marginLeft:'auto',
              fontSize:12, padding:'6px 8px',
              borderRadius:8
            }}
          >
            초기화
          </button>

          {/* 빨간/파란 작은 버튼 */}
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

        {/* 아이템 표시 */}
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

        {/* 메모 */}
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
              style={{width:'100%', minHeight:140, borderRadius:10, resize:'none'}}
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
