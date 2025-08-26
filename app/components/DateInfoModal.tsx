'use client';
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

type Item = {
  emoji: string | null;
  label: string;
  text?: string;
  /** 텍스트 없이 아이콘만 보여줄지 여부 (초기 드롭이 비어있거나, 편집 중 비우고 저장 시 true) */
  emojiOnly?: boolean;
};

type Note = {
  id?: number;
  y: number; m: number; d: number;
  content: string;
  items: Item[];
  color: 'red' | 'blue' | null;
};

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
  const emptyNote: Note = { y:date.y, m:date.m, d:date.d, content:'', items:[], color:null };

  const [note, setNote] = useState<Note>(initial || emptyNote);
  const [memo, setMemo] = useState(note.content || '');
  const [initialMemo, setInitialMemo] = useState(note.content || '');

  // 칩 편집 상태
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // 드래그 상태(순서 변경)
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const title = useMemo(() =>
    `${date.y}-${String(date.m+1).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
  , [date]);

  useEffect(()=>{
    if (!open) return;
    const base = initial || emptyNote;
    setNote(base);
    setMemo(base.content || '');
    setInitialMemo(base.content || '');
    setEditingIndex(null);
    setEditingText('');
    setDragIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // 항상 Note 반환(에러 throw)
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

  // 초기화: 행 삭제(메모/아이템/플래그 모두 제거)
  async function clearAll(){
    if(!canEdit){
      setMemo('');
      return;
    }
    const ok = window.confirm('해당 날짜의 메모/아이템/색상 표시를 모두 삭제할까요?');
    if(!ok) return;

    try{
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('y', date.y)
        .eq('m', date.m)
        .eq('d', date.d);
      if(error) throw new Error(error.message);

      const cleared: Note = { ...emptyNote };
      setNote(cleared);
      setMemo('');
      setInitialMemo('');
      setEditingIndex(null);
      alert('초기화했습니다.');
      onSaved(cleared);
    }catch(e:any){
      alert(e?.message ?? '초기화 중 오류가 발생했습니다.');
    }
  }

  // ===== 칩 더블클릭 → 편집 모드 진입 =====
  function onDoubleClickChip(idx:number){
    if(!canEdit) return;
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

  // 편집 중 삭제
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

  // 칩 표시 텍스트(emojiOnly 지원)
  function chipLabel(it: Item){
    if (it.text && it.text.length) return it.text;
    if (it.emojiOnly) {
      // 아이콘만. 아이콘 없으면 라벨 fallback
      return it.emoji ? it.emoji : it.label;
    }
    return `${it.emoji ? it.emoji+' ' : ''}${it.label}`;
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

        {/* 아이템 목록 (더블클릭 편집 + 드래그/드랍 순서변경) */}
        {(note.items?.length || 0) === 0 ? (
          <div style={{opacity:.6,fontSize:13, marginBottom:6}}>아이템 없음</div>
        ) : (
          <div
            className="chips"
            style={{marginBottom:6}}
            onDragOver={(e)=>{ if(canEdit){ e.preventDefault(); }}}
            onDrop={onDropContainer}
          >
            {note.items.map((it:Item, idx:number)=>(
              <span
                key={idx}
                className="chip"
                title={canEdit ? '더블클릭: 편집, 드래그: 순서 변경' : undefined}
                onDoubleClick={()=> onDoubleClickChip(idx)}
                draggable={canEdit}
                onDragStart={(e)=>onDragStartChip(e, idx)}
                onDragOver={onDragOverChip}
                onDrop={(e)=>onDropChip(e, idx)}
                style={dragIndex===idx ? { opacity:.6 } : undefined}
              >
                {chipLabel(it)}
              </span>
            ))}
          </div>
        )}

        {/* ▽ 칩 편집 영역: 더블클릭 시 표시 */}
        {canEdit && editingIndex!==null && (
          <div style={{
            display:'flex', gap:8, alignItems:'center',
            padding:'8px 10px', border:'1px solid var(--border)',
            borderRadius:10, margin:'6px 0'
          }}>
            <span style={{fontSize:12, opacity:.7}}>아이템 편집</span>
            <input
              value={editingText}
              onChange={(e)=>setEditingText(e.target.value)}
              placeholder="빈칸으로 저장하면 아이콘만 표시"
              style={{flex:1, padding:'6px 8px', borderRadius:8}}
            />
            <button onClick={saveChipEdit}>저장</button>
            <button onClick={deleteChip} style={{borderColor:'#b12a2a', color:'#b12a2a'}}>삭제</button>
            <button onClick={cancelChipEdit}>취소</button>
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
