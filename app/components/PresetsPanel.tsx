'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Preset = { id:number; emoji:string|null; label:string; sort_order:number };

export default function PresetsPanel({
  canEdit,
  mode = 'vertical', // 기본 vertical 로 사용
}:{
  canEdit: boolean;
  mode?: 'vertical' | 'inline' | 'section';
}){
  const supabase = createClient();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [activeId,setActiveId]=useState<number|null>(null);

  // add form (＋ 토글)
  const [showAdd,setShowAdd]=useState(false);
  const [emoji,setEmoji]=useState('');
  const [label,setLabel]=useState('');

  useEffect(()=>{
    supabase.from('presets').select('*').order('sort_order',{ascending:true})
      .then(({data,error})=>{
        if(error){ console.error(error); return; }
        setPresets((data||[]) as any);
      });
  },[]);

  async function addPreset(){
    if(!label.trim()){ alert('텍스트는 필수입니다.'); return; }
    const payload = { emoji: (emoji.trim()||null), label: label.trim(), sort_order:(presets.at(-1)?.sort_order||0)+10 };
    const { data, error } = await supabase.from('presets').insert(payload).select().single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]);
    setEmoji(''); setLabel(''); setShowAdd(false);
  }
  async function deletePreset(id:number){
    const ok = window.confirm('해당 프리셋을 삭제할까요?');
    if(!ok) return;
    const { error } = await supabase.from('presets').delete().eq('id', id);
    if(error){ alert(error.message); return; }
    setPresets(p => p.filter(x => x.id !== id));
    setActiveId(null);
  }

  if (mode !== 'vertical') {
    // 다른 모드는 기존 구현 사용 중이면 그대로 두세요(생략)
  }

  // ▼ Vertical 모드: 한 칩 = 내용에 맞춘 pill, 세로로 나열
  return (
    <div className="preset-vertical-list">
      {canEdit && (
        <>
          <button className="preset-add-icon" aria-label="프리셋 추가" onClick={()=>setShowAdd(s=>!s)}>＋</button>
          {showAdd && (
            <div className="preset-add-form" style={{left:0, right:'auto'}} onKeyDown={(e)=>{ if(e.key==='Enter') addPreset(); }}>
              <input placeholder="아이콘" value={emoji} onChange={e=>setEmoji(e.target.value)} />
              <input placeholder="텍스트" value={label} onChange={e=>setLabel(e.target.value)} />
              <div className="preset-add-actions">
                <button onClick={()=>{ setShowAdd(false); setEmoji(''); setLabel(''); }}>취소</button>
                <button onClick={addPreset}>추가</button>
              </div>
            </div>
          )}
        </>
      )}

      {presets.map(p=>(
        <div
          key={p.id}
          className="preset-chip"
          draggable={canEdit}
          onDragStart={(e)=>{ if(!canEdit) return; e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p })); setActiveId(null); }}
          onClick={()=>{ if(!canEdit) return; setActiveId(a => a===p.id ? null : p.id); }}
          title={canEdit ? '달력에 드래그하여 배치 / 클릭하면 삭제 버튼 표시' : undefined}
        >
          {p.emoji ? <span aria-hidden>{p.emoji}</span> : null}
          <span className="chip-label" style={{fontSize:13}}>{p.label}</span>
          {canEdit && activeId===p.id && (
            <button className="trash" onClick={(e)=>{ e.stopPropagation(); deletePreset(p.id); }}>🗑</button>
          )}
        </div>
      ))}
    </div>
  );
}
